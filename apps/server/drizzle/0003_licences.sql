-- Crédits en français (EF-8.4) : Commons renvoie « Public domain », les drapeaux portent « Domaine public ».
UPDATE `images` SET `licence` = 'Domaine public' WHERE lower(trim(`licence`)) = 'public domain';
