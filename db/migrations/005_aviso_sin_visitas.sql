-- 005: aviso de "landing entregada sin visitas" en el inicio del panel.
-- No hay plazo: el aviso aparece desde la entrega y queda hasta que el lead visita la landing
-- o alguien lo descarta a mano (decidido el 29/09).
ALTER TABLE landings ADD COLUMN aviso_sin_visitas_descartado_el TIMESTAMPTZ;
