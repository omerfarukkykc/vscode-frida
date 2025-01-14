import * as vscode from 'vscode';
import * as child_process from 'child_process';
class WsaTreeItem extends vscode.TreeItem {
    public children: WsaTreeItem[] = [];

    constructor(
      public readonly label: string,
      public readonly description: string,
      public readonly collapsibleState: vscode.TreeItemCollapsibleState
    ) {
      super(label, collapsibleState);
      this.tooltip = `${this.label}: ${this.description}`;
    }
  }
  
  export class WsaProvider implements vscode.TreeDataProvider<WsaTreeItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<WsaTreeItem | undefined | void> = new vscode.EventEmitter<WsaTreeItem | undefined | void>();
    readonly onDidChangeTreeData: vscode.Event<WsaTreeItem | undefined | void> = this._onDidChangeTreeData.event;
  
    constructor() {
      setInterval(() => this.refresh(), 5000); // Refresh every 5 seconds
    }
  
    getTreeItem(element: WsaTreeItem): vscode.TreeItem {
      return element;
    }
  
    getChildren(element?: WsaTreeItem): Thenable<WsaTreeItem[]> {
      return Promise.resolve(this.getWsaProcessInfo());
    }
  
    private getWsaProcessInfo(): WsaTreeItem[] {
      try {
        const processInfo = child_process.execSync('Get-Process -Name WsaClient | Format-Table Handles, NPM, PM, WS, CPU, Id, SI, ProcessName -AutoSize', { shell: 'powershell.exe' }).toString();
        const lines = processInfo.split('\n').filter(line => line.trim() !== ''); 
        const headers = lines[0].trim().split(/\s+/); // Headers row (Handles, NPM, PM, etc.)
        const values = lines.slice(2).map(line => line.trim().split(/\s+/)); // Data rows
  
        // Create a TreeItem for each value, grouped under each row
        return values.flatMap((row, rowIndex) => {
          const children = headers.map((header, colIndex) => 
            new WsaTreeItem(header, row[colIndex] || '', vscode.TreeItemCollapsibleState.None)
          );
          return [...children];
        });
      } catch (error) {
        return [new WsaTreeItem('Error fetching process data, wsa may have been stopped.', '', vscode.TreeItemCollapsibleState.None)];
      }
    }
  
    refresh(): void {
      this._onDidChangeTreeData.fire();
    }
  }