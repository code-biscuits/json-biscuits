import * as vscode from "vscode";
import {
  getLanguageService,
  Node,
  TextDocument as HtmlTextDocument,
} from "vscode-html-languageservice";
import { createActivate } from "biscuits-base";

import * as ts from "typescript";

// Needs to be genericized
const CONFIG_PREFIX_KEY = "json-biscuits.annotationPrefix";
const CONFIG_COLOR_KEY = "json-biscuits.annotationColor";
const CONFIG_DISTANCE_KEY = "json-biscuits.annotationMinDistance";
const CONFIG_MAX_LENGTH = "json-biscuits.annotationMaxLength";

export const activate = createActivate(
  CONFIG_COLOR_KEY,
  CONFIG_DISTANCE_KEY,
  CONFIG_PREFIX_KEY,
  {
    createDecorations(
      text: string,
      activeEditor: vscode.TextEditor,
      prefix: string,
      minDistance: number
    ) {
      // We bail on a script tag to prevent Vue and Svelte file usage
      if (text.indexOf("<script") > -1) {
        console.warn(
          "Bailing out of JS/TS Biscuits due to <script tag. Apologies if you just have it in a string. We need to be able to handle this better. Work in progress."
        );
        return [];
      }

      const decorations: any[] = [];

      const sourceFile = ts.createSourceFile(
        "currentFile",
        text,
        ts.ScriptTarget.Latest
      );

      let nodes: any = sourceFile.statements;

      let children: any[] = [];
      while (nodes.length !== 0) {
        nodes.forEach((node: any) => {
          console.log("NODE: ", node);

          // crawl tree
          if (node?.statements?.length) {
            children = [...children, ...node.statements];

            let propertyStatement: any;
            node.statements.forEach((statement: any, index: number) => {
              if (index % 2 === 1) {
                const { line: startLine } = ts.getLineAndCharacterOfPosition(
                  sourceFile,
                  statement.pos
                );
                const { line } = ts.getLineAndCharacterOfPosition(
                  sourceFile,
                  statement.end
                );

                const endOfLine = activeEditor.document.lineAt(line).range.end;

                if (line - startLine >= minDistance) {
                  decorations.push({
                    range: new vscode.Range(
                      activeEditor.document.positionAt(statement.end),
                      endOfLine
                    ),
                    renderOptions: {
                      after: {
                        contentText: `${prefix} ${propertyStatement?.expression?.text}`,
                      },
                    },
                  });
                }
              } else {
                propertyStatement = statement;
              }
            });
          }

          if (activeEditor) {
            // most likely will change start and end finding
            const { line: startLine } = ts.getLineAndCharacterOfPosition(
              sourceFile,
              node.pos
            );
            const { line } = ts.getLineAndCharacterOfPosition(
              sourceFile,
              node.end
            );
            const endOfLine = activeEditor.document.lineAt(line).range.end;

            let contentText = "";

            if (contentText !== prefix && line - startLine >= minDistance) {
              let maxLength: number =
                vscode.workspace.getConfiguration().get(CONFIG_MAX_LENGTH) || 0;
              if (maxLength && contentText.length > maxLength) {
                contentText = contentText.substr(0, maxLength) + "...";
              }

              decorations.push({
                range: new vscode.Range(
                  activeEditor.document.positionAt(node.end),
                  endOfLine
                ),
                renderOptions: {
                  after: {
                    contentText,
                  },
                },
              });
            }
          }
        });

        nodes = [...children];
        children = [];
      }
      return decorations;
    },
  }
);
