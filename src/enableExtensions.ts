import { commands, ExtensionContext, window, MessageItem, Uri, extensions, workspace } from "vscode";
import { exec, execSync } from "child_process";
import { Configs } from "./types";
import { getWorkSpacePath, getConfigs, isConfirm } from "./utils";

function runDisableShell(cmd: string, cwd: string, configs: Configs) {
  const openCode = () => {
    exec(cmd, { cwd }, (error) => {
      if (error) {
        console.error(`exec error: ${error}`);
        window.showErrorMessage(error?.message || `exec command error: ${error}`);
      }
    });
  };

  if (configs.openInNewWindow === false) {
    commands.executeCommand("workbench.action.closeFolder")
      .then(() => setTimeout(openCode, 200));
  } else {
    commands.executeCommand("workbench.action.closeWindow");
    openCode();
  }
}

async function enableExtensions(context: ExtensionContext) {
  const configs: Configs = await getConfigs(context);
  if (configs.enabled.length === 0) {
    window.showInformationMessage("No extensions to enable found in config file.");
    return;
  }
  const workspacePath = getWorkSpacePath();
  let code = null;
  try {
    execSync("code -v", { cwd: workspacePath });
    code = "code"
  } catch (error) {
    console.log("error :>> ", error);
    try {
      execSync("code-insiders -v", { cwd: workspacePath });
      code = "code-insiders"
    } catch (error) {
      interface MsgItem extends MessageItem {
        value: "confirm";
      }
      const result = await window.showErrorMessage<MsgItem>(
        `'code' command is not recognized.`,
        { title: "Learn more", value: "confirm" }
      );

      if (result?.value === "confirm") {
        const url = "https://code.visualstudio.com/docs/editor/command-line#_common-questions";
        commands.executeCommand("vscode.open", Uri.parse(url));
      }
      return;
    }
  }
  if (code) {
    let cmd = configs.openInNewWindow === false ? `${code} --reuse-window` : `${code} --new-window`;
    let disableCheck, enableCheck = false
    const enabledExtensions = extensions.all.filter(extension => !extension.id.startsWith('vscode.'));


    const extensionsToDisable = enabledExtensions.filter(a => !configs.enabled.includes(a.id));
    extensionsToDisable.forEach((ext) => {
      disableCheck = true
      cmd += ` --disable-extension ${ext.id}`;
    });
    if (configs.enabled.length) {
      configs.enabled.forEach((id) => {
        const check = enabledExtensions.find(a => a.id == id);
        if (!check) {
          enableCheck = true
          cmd += ` --enable-proposed-api=${id}`;
        }
      })
    }
    if (disableCheck || enableCheck) {
      cmd += ` ${workspacePath}`;
      if (configs.autoReload === false) {
        const message = "Disable extensions and open new VS Code?";
        const result = await isConfirm(message);
        console.log(cmd, 'cmd');

        if (result) {
          runDisableShell(cmd, workspacePath, configs);
        }
      } else {
        runDisableShell(cmd, workspacePath, configs);
      }
    } else {
      window.showInformationMessage("No extensions to enable");
      return;
    }
  }

}

export default enableExtensions;
