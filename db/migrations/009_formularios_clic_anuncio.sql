-- 009: identificador del clic en el anuncio de Google Ads con el que llegó cada envío del formulario.
-- gclid (clic normal), gbraid y wbraid (clics desde iOS/apps). Permite subir a Google Ads las
-- reuniones o ventas cerradas como conversiones offline. Son opcionales: la mayoría de los envíos
-- no vienen de un anuncio. Se borran con el formulario (depuración a los 24 meses).
ALTER TABLE formularios ADD COLUMN IF NOT EXISTS gclid TEXT;
ALTER TABLE formularios ADD COLUMN IF NOT EXISTS gbraid TEXT;
ALTER TABLE formularios ADD COLUMN IF NOT EXISTS wbraid TEXT;
