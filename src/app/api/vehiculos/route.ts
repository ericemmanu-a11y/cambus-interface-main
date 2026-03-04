/**
 * ============================================================================
 * Proyecto CamBus V3 - Sistema de Control Logístico y LPR
 * Desarrollado por: Eric Emmanuel (GitHub: ericemmanu-a11y)
 * Propiedad Intelectual y Licencia de Uso Exclusivo
 * ============================================================================
 */
import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { cookies } from 'next/headers';
import { decrypt } from '@/lib/session';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const client = await pool.connect();
        const result = await client.query(`
            SELECT rv.id_registro, rv.placa, a.numero_anden, rv.evento, 
                   rv.fecha_hora_entrada, rv.fecha_hora_salida, rv.confianza_placa, c.nombre_camara
            FROM registros_vehiculos rv
            LEFT JOIN andenes a ON rv.id_anden = a.id_anden
            LEFT JOIN camaras c ON rv.id_camara = c.id_camara
            ORDER BY rv.fecha_hora_entrada DESC
            LIMIT 50
        `);
        client.release();
        return NextResponse.json({ success: true, data: result.rows });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: 'Database error', detail: error.message }, { status: 500 });
    }
}

export async function POST(req: Request) {
    const cookieStore = await cookies();
    const session = cookieStore.get('session')?.value;
    if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const payload = await decrypt(session);
    if (!payload || !['admin', 'supervisor'].includes(payload.rol as string)) {
        return NextResponse.json({ success: false, error: 'Forbidden. Admin or Supervisor role required.' }, { status: 403 });
    }

    try {
        const body = await req.json();
        const { placa, id_anden, evento } = body;

        if (!placa || !id_anden || !evento) {
            return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
        }

        const client = await pool.connect();

        // Si es entrada, creamos el registro con un hash falso (manual)
        if (evento === 'entrada') {
            await client.query(`
                INSERT INTO registros_vehiculos 
                (placa, id_anden, evento, confianza_placa, hash_imagen)
                VALUES ($1::varchar, $2::int, 'entrada', 99.9, encode(digest('registro_manual_' || $1::varchar || extract(epoch from now())::text, 'sha256'), 'hex'))
            `, [placa, id_anden]);
        }
        // Si es salida, actualizamos el registro que estaba "abierto" en ese andén
        else if (evento === 'salida') {
            await client.query(`
                UPDATE registros_vehiculos
                SET evento = 'salida', fecha_hora_salida = NOW()
                WHERE placa = $1::varchar AND id_anden = $2::int AND fecha_hora_salida IS NULL
             `, [placa, id_anden]);

            // Insertamos un evento de salida para la tabla como historial nuevo también (replicando comportamiento real logs)
            await client.query(`
                INSERT INTO registros_vehiculos 
                (placa, id_anden, evento, confianza_placa, hash_imagen)
                VALUES ($1::varchar, $2::int, 'salida', 99.9, encode(digest('registro_manual_salida_' || $1::varchar || extract(epoch from now())::text, 'sha256'), 'hex'))
            `, [placa, id_anden]);
        }

        client.release();

        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: 'Database error', detail: error.message }, { status: 500 });
    }
}

export async function PUT(req: Request) {
    const cookieStore = await cookies();
    const session = cookieStore.get('session')?.value;
    if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const payload = await decrypt(session);
    if (!payload || !['admin', 'supervisor'].includes(payload.rol as string)) {
        return NextResponse.json({ success: false, error: 'Forbidden. Admin or Supervisor role required.' }, { status: 403 });
    }

    try {
        const body = await req.json();
        const { id_registro, placa, id_anden, evento } = body;

        if (!id_registro) {
            return NextResponse.json({ success: false, error: 'Missing id_registro' }, { status: 400 });
        }

        const client = await pool.connect();
        const result = await client.query(
            `UPDATE registros_vehiculos 
             SET placa = COALESCE($1, placa),
                 id_anden = COALESCE($2, id_anden),
                 evento = COALESCE($3, evento)
             WHERE id_registro = $4 RETURNING *`,
            [placa, id_anden, evento, id_registro]
        );
        client.release();

        if (result.rowCount === 0) {
            return NextResponse.json({ success: false, error: 'Registro not found' }, { status: 404 });
        }

        return NextResponse.json({ success: true, data: result.rows[0] });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: 'Database error', detail: error.message }, { status: 500 });
    }
}

export async function DELETE(req: Request) {
    const cookieStore = await cookies();
    const session = cookieStore.get('session')?.value;
    if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const payload = await decrypt(session);
    if (!payload || !['admin', 'supervisor'].includes(payload.rol as string)) {
        return NextResponse.json({ success: false, error: 'Forbidden. Admin or Supervisor role required.' }, { status: 403 });
    }

    try {
        const { searchParams } = new URL(req.url);
        const id_registro = searchParams.get('id');

        if (!id_registro) {
            return NextResponse.json({ success: false, error: 'Missing id param' }, { status: 400 });
        }

        const client = await pool.connect();
        const result = await client.query(`DELETE FROM registros_vehiculos WHERE id_registro = $1 RETURNING *`, [id_registro]);
        client.release();

        if (result.rowCount === 0) {
            return NextResponse.json({ success: false, error: 'Registro not found' }, { status: 404 });
        }

        return NextResponse.json({ success: true, data: result.rows[0] });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: 'Database error', detail: error.message }, { status: 500 });
    }
}
