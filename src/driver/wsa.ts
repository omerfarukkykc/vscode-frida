import { execFile } from 'child_process';
import * as vscode from 'vscode';
import { get } from 'http';
import net from 'net';
import util from 'util';
import { refresh } from '../utils';
const execFilePromise = util.promisify(execFile);
function getWsaAdbAddress() {
    return vscode.workspace.getConfiguration('wsa')
        .get('host', 'localhost') + ":" + vscode.workspace.getConfiguration('wsa')
            .get('port', 58526);
}
function getWsaHost() {
    return vscode.workspace.getConfiguration('wsa')
        .get('host', 'localhost');
}
function getWsaPort() {
    return vscode.workspace.getConfiguration('wsa')
        .get('port', 58526);
}
function isPortOpen(port: number, host: string = 'localhost', timeout: number = 1000): Promise<boolean> {
    return new Promise((resolve) => {
        const socket = new net.Socket();
        let isResolved = false;

        socket.setTimeout(timeout);
        socket.on('connect', () => {
            resolve(true);
            isResolved = true;
            socket.destroy();
        }).on('timeout', () => {
            resolve(false);
            isResolved = true;
            socket.destroy();
        }).on('error', () => {
            if (!isResolved) {
                resolve(false);
            }
        }).connect(port, host);
    });
}

async function waitForPort(port: number, interval: number = 1000, timeout: number = 30000): Promise<void> {
    const endTime = Date.now() + timeout;
    while (Date.now() < endTime) {
        if (await isPortOpen(port)) {
            return;
        }
        await new Promise(resolve => setTimeout(resolve, interval));
    }
    throw new Error(`Timeout waiting for port ${port} to open.`);
}
// Function to start WSA
export async function startWSA(): Promise<void> {
    await vscode.window.withProgress(
        {
            location: vscode.ProgressLocation.Notification,
            title: "Wsa starting...",
            cancellable: false
        },
        async (progress) => {
            progress.report({ increment: 25 });

            try {
                await execFilePromise('start', ['wsa://'], { shell: true });
                console.log('WSA started, waiting for ADB debug port...');
                progress.report({ increment: 25 });
                
                // Assuming the default ADB port is 5555
                await waitForPort(getWsaPort());
                
                console.log('ADB debug port is open. Connecting using ADB...');
                progress.report({ increment: 25 });
                
                // Connect using ADB
                await execFilePromise('adb', ['connect', getWsaAdbAddress()]);
                console.log('Connected to WSA using ADB.');

                refresh();
                progress.report({ increment: 25 });

            } catch (error) {
                if (error instanceof Error) {
                    throw new Error(`Failed to start WSA or connect using ADB: ${error.message}`);
                } else {
                    throw new Error('Failed to start WSA or connect using ADB: Unknown error');
                }
            }

            // Show a completion message after the loading animation
            vscode.window.showInformationMessage('WSA started successfully.');
        }
    );
   

}

// Function to stop WSA
export async function stopWSA(): Promise<void> {
    await vscode.window.withProgress(
        {
            location: vscode.ProgressLocation.Notification,
            title: "Wsa stopping...",
            cancellable: false
        },
        async (progress) => {
            progress.report({ increment: 50 });

            try {
                await execFilePromise('taskkill', ['/F', '/IM', 'WsaClient.exe'], { shell: true });
            } catch (error) {
                if (error instanceof Error) {
                    throw new Error(`Failed to stop WSA: ${error.message}`);
                } else {
                    throw new Error('Failed to stop WSA: Unknown error');
                }
            }
            progress.report({ increment: 100 });

            // Show a completion message after the loading animation
            vscode.window.showInformationMessage('WSA stopped successfully.');
        }
    );
    refresh();
}

// Function to reboot WSA
export async function rebootWSA(): Promise<void> {
    try {
        await stopWSA();
        console.log('WSA stopped successfully.');

        // Adding a delay to ensure WSA is fully stopped before restarting
        await new Promise(resolve => setTimeout(resolve, 5000));

        await startWSA();
        console.log('WSA started successfully.');
    } catch (error) {
        if (error instanceof Error) {
            throw new Error(`Failed to reboot WSA: ${error.message}`);
        } else {
            throw new Error('Failed to reboot WSA: Unknown error');
        }
    }
}

