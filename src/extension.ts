import { ExtensionContext } from 'vscode';
import enableExtensions from './enableExtensions';

export function activate(context: ExtensionContext) {
	console.log('"enable-extensions" is now active!');
  enableExtensions(context);
}

export function deactivate() {}
