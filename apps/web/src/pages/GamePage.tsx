import { MISMATCH_DELAY_MS, pickImageUrl, type FinishGameResponse, type Move } from '@recto/shared';
import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router';
import { ApiError, api, isTransient } from '../api/client';
import { Board, type CardFace } from '../components/Board';
import { Countdown } from '../components/Countdown';
import { Stopwatch } from '../components/Stopwatch';
import { invalidateStats } from '../game/bestTimes';
import { engineReducer, initEngine, type FlipEvent } from '../game/engine';
import type { GameLocationState, ResultLocationState } from '../game/navigation';
import { preloadImages, whenVisible } from '../game/preload';
import { saveResult } from '../game/records';
import { difficultyLabel, t } from '../i18n';
import { sizeForDifficulty, supportsAvif } from '../lib/images';
import { playSound } from '../lib/sound';
import { useDocumentTitle } from '../lib/useDocumentTitle';
import { usePreferences } from '../settings/PreferencesContext';
import styles from './GamePage.module.css';

/** Laisse voir la dernière paire avant l'écran de résultat. */
const LAST_PAIR_PAUSE_MS = 650;

const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export function GamePage() {
  const { id } = useParams();
  const state = useLocation().state as GameLocationState | null;
  useDocumentTitle(t('game.title'));

  if (!state || state.game.gameId !== id) return <GameMessage message={t('game.missing')} />;
  return <GameSession key={state.game.gameId} game={state.game} categoryName={state.categoryName} />;
}

function GameMessage({ message, category }: { message: string; category?: string }) {
  return (
    <div className={styles.message} role="alert">
      <p>{message}</p>
      <Link className="btn btn-primary" to={category ? `/jouer/${category}` : '/categories'}>
        {t('game.newGame')}
      </Link>
    </div>
  );
}

/**
 * Horloge d'affichage, en temps `performance.now()`. Elle suit le serveur au plus
 * près, mais seule la durée mesurée par le serveur fait foi (ENF-1.1).
 */
interface DisplayClock {
  origin: number | null;
  pausedAt: number | null;
  pausedTotal: number;
  stoppedAt: number | null;
}

function describe(event: FlipEvent | null, deck: readonly string[], faces: ReadonlyMap<string, CardFace>): string {
  if (!event) return '';
  const title = (index: number | undefined) => faces.get(deck[index ?? -1] ?? '')?.title ?? '';
  const [a, b] = event.cards;
  switch (event.kind) {
    case 'reveal':
      return t('game.announceReveal', { title: title(a) });
    case 'match':
      return t('game.announceMatch', { title: title(a) });
    case 'miss':
      return t('game.announceMiss', { a: title(a), b: title(b) });
  }
}

/**
 * Images d'au moins une tentative infructueuse : deux positions retournées qui ne portaient pas
 * la même image. Ce sont les paires que le joueur a cherchées, donc celles qu'il gagne à revoir.
 */
export function missedImages(moves: readonly Move[], deck: readonly string[]): string[] {
  const missed = new Set<string>();
  for (const [a, b] of moves) {
    const first = deck[a];
    const second = deck[b];
    if (first && second && first !== second) {
      missed.add(first);
      missed.add(second);
    }
  }
  return [...missed];
}

function GameSession({ game, categoryName, daily }: GameLocationState) {
  const navigate = useNavigate();
  const [engine, dispatch] = useReducer(engineReducer, game.deck, initEngine);
  const [loaded, setLoaded] = useState(0);
  const [countdownEnd, setCountdownEnd] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmingAbandon, setConfirmingAbandon] = useState(false);
  const [finishFailed, setFinishFailed] = useState(false);
  const [finishAttempt, setFinishAttempt] = useState(0);
  /** Vrai si la demande d'abandon a elle-même suspendu la partie : l'annulation la reprend. */
  const resumeAfterCancel = useRef(false);
  const [faces, setFaces] = useState<ReadonlyMap<string, CardFace>>(
    () => new Map(game.images.map((image) => [image.id, { title: image.title, url: '' }])),
  );
  const preloaded = useRef<HTMLImageElement[]>([]);
  const starting = useRef<Promise<void> | null>(null);
  const finishing = useRef<Promise<FinishGameResponse> | null>(null);
  const clock = useRef<DisplayClock>({ origin: null, pausedAt: null, pausedTotal: 0, stoppedAt: null });

  const readClock = useCallback(() => {
    const { origin, pausedAt, pausedTotal, stoppedAt } = clock.current;
    if (origin === null) return 0;
    return (stoppedAt ?? pausedAt ?? performance.now()) - origin - pausedTotal;
  }, []);

  // ENF-2.2 — préchargement intégral, puis démarrage côté serveur. Le serveur fait
  // partir le chronomètre à la fin du décompte ; le temps de chargement n'est pas compté.
  useEffect(() => {
    starting.current ??= (async () => {
      // Format et résolution sont fixés avant le préchargement : la grille affichera exactement ces fichiers.
      const avif = await supportsAvif();
      const size = sizeForDifficulty(game.difficulty);
      const resolved = new Map(
        game.images.map((image) => [image.id, { title: image.title, url: pickImageUrl(image.sources, size, avif) }]),
      );
      preloaded.current = await preloadImages(
        [...resolved.values()].map((face) => face.url),
        setLoaded,
      );
      setFaces(resolved);
      await whenVisible();
      const { countdownMs } = await api.startGame(game.gameId, game.token);
      const end = performance.now() + countdownMs;
      clock.current.origin = end;
      setCountdownEnd(end);
      dispatch({ type: 'ready' });
    })().catch((caught: unknown) => {
      setError(caught instanceof ApiError && caught.status === 409 ? t('game.interrupted') : t('game.loadError'));
    });
  }, [game]);

  // EF-8.1 — sons de partie, si le joueur les a activés. La dernière paire sonne la fin.
  const { preferences } = usePreferences();
  const soundedSeq = useRef(0);
  useEffect(() => {
    const event = engine.lastEvent;
    // Un son par événement, identifié par son numéro d'ordre.
    if (!event || event.seq === soundedSeq.current) return;
    soundedSeq.current = event.seq;
    if (preferences.sound) playSound(event.kind === 'match' && engine.phase === 'finishing' ? 'finish' : event.kind);
  }, [engine.lastEvent, engine.phase, preferences.sound]);

  // Appariement incorrect : les deux cartes se retournent après 900 ms.
  useEffect(() => {
    if (!engine.locked) return;
    const timer = window.setTimeout(() => dispatch({ type: 'hideMismatch' }), MISMATCH_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [engine.locked]);

  // Dernière paire trouvée : le serveur rejoue les coups, valide et mesure la partie.
  useEffect(() => {
    if (engine.phase !== 'finishing' || finishing.current) return;
    clock.current.stoppedAt ??= performance.now();
    finishing.current = api.finishGame(game.gameId, { token: game.token, moves: [...engine.moves] });
    Promise.all([finishing.current, delay(LAST_PAIR_PAUSE_MS)]).then(
      ([result]) => {
        // Joueur connecté : le serveur fait foi. Invité : record conservé par le navigateur.
        let comparison: Pick<ResultLocationState, 'previous' | 'improved'>;
        if (result.record) {
          invalidateStats();
          comparison = result.record;
        } else {
          const saved = saveResult(game.category, game.difficulty, result);
          comparison = {
            previous: saved.previous ? { durationMs: saved.previous.bestMs, moves: saved.previous.recordMoves } : null,
            improved: saved.improved,
          };
        }
        dispatch({ type: 'finished' });
        const state: ResultLocationState = {
          result,
          ...comparison,
          category: game.category,
          categoryName,
          difficulty: game.difficulty,
          cards: game.images,
          missed: missedImages(engine.moves, game.deck),
          daily,
        };
        navigate(`/partie/${game.gameId}/resultat`, { replace: true, state });
      },
      (caught: unknown) => {
        // Réseau ou serveur indisponible : la clôture est rejouable, la partie n'est pas perdue.
        if (isTransient(caught)) setFinishFailed(true);
        else setError(t('game.finishError'));
      },
    );
  }, [engine.phase, engine.moves, game, categoryName, navigate, finishAttempt]);

  const retryFinish = useCallback(() => {
    finishing.current = null;
    setFinishFailed(false);
    setFinishAttempt((attempt) => attempt + 1);
  }, []);

  const paused = engine.phase === 'paused';
  const canPause = engine.phase === 'playing' || paused;
  const inProgress = engine.phase === 'countdown' || canPause;

  // EF-1.7 — le temps court toujours côté serveur : on prévient avant de quitter la page.
  useEffect(() => {
    if (!inProgress) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [inProgress]);

  // EF-1.5 — la pause suspend le chronomètre et masque la grille.
  const togglePause = useCallback(async () => {
    const { current } = clock;
    if (engine.phase === 'playing') {
      current.pausedAt = performance.now();
      dispatch({ type: 'pause' });
      await api.pauseGame(game.gameId, game.token).catch(() => undefined);
    } else if (engine.phase === 'paused') {
      await api.resumeGame(game.gameId, game.token).catch(() => undefined);
      if (current.pausedAt !== null) {
        current.pausedTotal += performance.now() - current.pausedAt;
        current.pausedAt = null;
      }
      dispatch({ type: 'resume' });
    }
  }, [engine.phase, game]);

  // Onglet quitté en cours de partie : pause automatique, le temps d'absence n'est pas compté.
  useEffect(() => {
    if (engine.phase !== 'playing') return;
    const onVisibility = () => {
      if (document.hidden) void togglePause();
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, [engine.phase, togglePause]);

  useEffect(() => {
    if (!canPause || confirmingAbandon) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() !== 'p' || event.ctrlKey || event.metaKey || event.altKey) return;
      event.preventDefault();
      void togglePause();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [canPause, confirmingAbandon, togglePause]);

  // EF-1.6 — abandon confirmé dans la page. La partie est suspendue le temps de la décision :
  // l'hésitation ne coûte pas de temps, et la grille reste masquée.
  const askAbandon = useCallback(async () => {
    resumeAfterCancel.current = engine.phase === 'playing';
    setConfirmingAbandon(true);
    if (resumeAfterCancel.current) await togglePause();
  }, [engine.phase, togglePause]);

  const cancelAbandon = useCallback(async () => {
    setConfirmingAbandon(false);
    if (resumeAfterCancel.current && engine.phase === 'paused') await togglePause();
    resumeAfterCancel.current = false;
  }, [engine.phase, togglePause]);

  const confirmAbandon = useCallback(async () => {
    await api.abandonGame(game.gameId, game.token).catch(() => undefined);
    navigate(`/jouer/${game.category}`, { replace: true });
  }, [game, navigate]);

  const flip = useCallback((index: number) => dispatch({ type: 'flip', index }), []);
  // Les images entrent dans les cartes, face cachée, dès la fin du préchargement et avant
  // l'appel /start : aucune requête d'image ne suit le démarrage du chronomètre (CA-08).
  const imagesReady = useMemo(() => [...faces.values()].every((face) => face.url !== ''), [faces]);
  const announcement = useMemo(() => describe(engine.lastEvent, engine.deck, faces), [engine.lastEvent, engine.deck, faces]);

  return (
    <div className={styles.session}>
      <h1 className="visually-hidden">
        {t('game.heading', { category: categoryName, level: difficultyLabel(game.difficulty) })}
      </h1>
      <div className={styles.hud}>
        <div className={styles.context}>
          <span className={styles.category}>{categoryName}</span>
          <span className={styles.level}>{difficultyLabel(game.difficulty)}</span>
        </div>
        <dl className={styles.metrics}>
          <div className={styles.metric}>
            <dt>{t('game.time')}</dt>
            <dd className={styles.time}>
              <Stopwatch read={readClock} running={engine.phase === 'playing'} />
            </dd>
          </div>
          <div className={styles.metric}>
            <dt>{t('game.moves')}</dt>
            <dd>{engine.moves.length}</dd>
          </div>
          <div className={styles.metric}>
            <dt>{t('game.pairs')}</dt>
            <dd>
              {engine.pairsFound}/{game.pairs}
            </dd>
          </div>
        </dl>
        <div className={styles.controls}>
          <button type="button" className="btn btn-ghost" onClick={togglePause} disabled={!canPause} aria-keyshortcuts="P">
            {paused ? t('game.resume') : t('game.pause')}
          </button>
          <button type="button" className="btn btn-ghost" onClick={askAbandon} disabled={!inProgress || confirmingAbandon}>
            {t('game.abandon')}
          </button>
        </div>
      </div>

      <div className={styles.stage}>
        <Board
          engine={engine}
          faces={faces}
          difficulty={game.difficulty}
          showImages={imagesReady}
          onFlip={flip}
        />
        {engine.phase === 'loading' && !error && (
          <div className={styles.loading} role="status">
            <p>{t('game.loading', { loaded, total: game.images.length })}</p>
            <progress max={game.images.length} value={loaded} />
          </div>
        )}
        {engine.phase === 'countdown' && countdownEnd !== null && (
          <Countdown endsAt={countdownEnd} onDone={() => dispatch({ type: 'go' })} />
        )}
        {confirmingAbandon && (
          <div className={styles.pauseMask}>
            <div
              className={styles.pausePanel}
              role="alertdialog"
              aria-modal="true"
              aria-labelledby="abandon-title"
              onKeyDown={(event) => {
                if (event.key === 'Escape') void cancelAbandon();
              }}
            >
              <p id="abandon-title" className={styles.pauseTitle}>
                {t('game.abandonTitle')}
              </p>
              <p>{t('game.abandonConfirm')}</p>
              <div className={styles.dialogActions}>
                <button type="button" className="btn btn-primary" onClick={cancelAbandon} autoFocus>
                  {t('game.abandonCancel')}
                </button>
                <button type="button" className="btn" onClick={confirmAbandon}>
                  {t('game.abandon')}
                </button>
              </div>
            </div>
          </div>
        )}
        {paused && !confirmingAbandon && (
          <div className={styles.pauseMask}>
            <div className={styles.pausePanel}>
              <p className={styles.pauseTitle}>{t('game.paused')}</p>
              <p>{t('game.pausedHint')}</p>
              <button type="button" className="btn btn-primary" onClick={togglePause} autoFocus>
                {t('game.resume')}
              </button>
            </div>
          </div>
        )}
        {finishFailed && (
          <div className={styles.pauseMask}>
            <div className={styles.pausePanel} role="alert">
              <p className={styles.pauseTitle}>{t('game.finishError')}</p>
              <p>{t('game.finishRetryHint')}</p>
              <div className={styles.dialogActions}>
                <button type="button" className="btn btn-primary" onClick={retryFinish} autoFocus>
                  {t('game.finishRetry')}
                </button>
                <Link className="btn" to={`/jouer/${game.category}`}>
                  {t('game.newGame')}
                </Link>
              </div>
            </div>
          </div>
        )}
        {error && (
          <div className={styles.pauseMask}>
            <div className={styles.pausePanel}>
              <GameMessage message={error} category={game.category} />
            </div>
          </div>
        )}
      </div>

      <p className="visually-hidden" aria-live="polite">
        {announcement}
      </p>
    </div>
  );
}
