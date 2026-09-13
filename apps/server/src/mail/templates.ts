/**
 * Courriels de service : une version texte et une version HTML de même contenu. Le HTML reste
 * sobre et en styles en ligne (seuls compris par les messageries), sans image distante ni traceur.
 */
export interface ActionEmail {
  greeting: string;
  intro: string;
  actionLabel: string;
  url: string;
  notes: string[];
}

const escapeHtml = (value: string) =>
  value.replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!);

export function actionEmail({ greeting, intro, actionLabel, url, notes }: ActionEmail): { text: string; html: string } {
  const text = [greeting, '', intro, url, '', ...notes].join('\n');
  const link = escapeHtml(url);
  const html = `<!doctype html>
<html lang="fr">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>RECTO</title></head>
<body style="margin:0;padding:0;background:#f3f5f8;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f5f8;padding:24px 12px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border:1px solid #dbe2ea;border-radius:14px;font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#0f1720;">
        <tr><td style="padding:22px 28px;background:#0b0f14;border-radius:14px 14px 0 0;">
          <span style="color:#e7edf4;font-size:18px;font-weight:800;letter-spacing:5px;">RECTO</span>
          <span style="color:#93ddff;font-size:13px;padding-left:10px;">Retournez. Retenez.</span>
        </td></tr>
        <tr><td style="padding:28px;font-size:16px;line-height:1.5;">
          <p style="margin:0 0 14px;">${escapeHtml(greeting)}</p>
          <p style="margin:0 0 22px;">${escapeHtml(intro.replace(/\s*:\s*$/, '.'))}</p>
          <p style="margin:0 0 24px;"><a href="${link}" style="display:inline-block;padding:12px 22px;border-radius:999px;background:#0a7bbf;color:#ffffff;font-weight:700;text-decoration:none;">${escapeHtml(actionLabel)}</a></p>
          <p style="margin:0 0 6px;color:#4d5b6c;font-size:13px;">Si le bouton ne fonctionne pas, copiez cette adresse dans votre navigateur :</p>
          <p style="margin:0 0 22px;font-size:13px;word-break:break-all;"><a href="${link}" style="color:#06679f;">${link}</a></p>
          ${notes.map((note) => `<p style="margin:0 0 6px;color:#4d5b6c;font-size:13px;">${escapeHtml(note)}</p>`).join('\n          ')}
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>
`;
  return { text, html };
}
