import { NextResponse } from 'next/server';
import { spawn, ChildProcess } from 'child_process';
import { cookies } from 'next/headers';
import { decrypt } from '@/lib/session';

export const dynamic = 'force-dynamic';

// Global reference to track the running daemon process in Next.js development server
declare global {
    var _daemonProcess: ChildProcess | null;
}

if (!global._daemonProcess) {
    global._daemonProcess = null;
}

export async function GET() {
    return NextResponse.json({
        success: true,
        isRunning: global._daemonProcess !== null
    });
}

export async function POST(req: Request) {
    // 1. Authenticate Admin/Supervisor
    const cookieStore = await cookies();
    const session = cookieStore.get('session')?.value;
    if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const payload = await decrypt(session);
    if (!payload || !['admin', 'supervisor'].includes(payload.rol as string)) {
        return NextResponse.json({ success: false, error: 'Forbidden. Admin role required.' }, { status: 403 });
    }

    try {
        const body = await req.json();
        const { action } = body;

        if (action === 'start') {
            if (global._daemonProcess) {
                return NextResponse.json({ success: false, error: 'Motor ya está activo', isRunning: true });
            }

            // Iniciar simulador LPR (scripts/daemon.js) de fondo en el mismo directorio del proyecto
            const cmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';
            global._daemonProcess = spawn(cmd, ['run', 'daemon'], {
                detached: false,
                stdio: 'ignore'
            });

            global._daemonProcess.on('exit', () => {
                global._daemonProcess = null;
            });

            return NextResponse.json({ success: true, message: 'Motor iniciado con éxito.', isRunning: true });
        }

        else if (action === 'stop') {
            if (!global._daemonProcess) {
                return NextResponse.json({ success: false, error: 'El motor ya está apagado.', isRunning: false });
            }

            // Kill child gracefully
            if (process.platform === 'win32') {
                spawn('taskkill', ['/pid', global._daemonProcess.pid!.toString(), '/f', '/t']);
            } else {
                global._daemonProcess.kill('SIGINT');
            }

            global._daemonProcess = null;
            return NextResponse.json({ success: true, message: 'Motor detenido exitosamente.', isRunning: false });
        }

        return NextResponse.json({ success: false, error: 'Invalid action.' }, { status: 400 });

    } catch (error: any) {
        return NextResponse.json({ success: false, error: 'Hubo un error configurando el motor.', detail: error.message }, { status: 500 });
    }
}
