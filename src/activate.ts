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
      const decorations: any[] = [];

      const newText = `const foo = ${text}`;
      const addedTextLength = newText.length - text.length;

      const sourceFile = ts.createSourceFile(
        "currentFile",
        newText,
        ts.ScriptTarget.Latest
      );

      let initializer = (sourceFile.statements[0] as any).declarationList
        .declarations[0].initializer;

      let nodes: any = initializer.properties || initializer.elements;

      let children: any[] = [];
      while (nodes.length !== 0) {
        nodes.forEach((statement: any, index: number) => {
          // crawl tree
          if (statement?.statements?.length) {
            children = [...children, ...statement.statements];
          }

          if (statement?.elements?.length) {
            children = [...children, ...statement.elements];
          }

          if (statement?.properties?.length) {
            children = [...children, ...statement.properties];
          }

          if (statement?.initializer) {
            children.push(statement.initializer);
          }

          const { line: startLine } = ts.getLineAndCharacterOfPosition(
            sourceFile,
            statement.pos - addedTextLength
          );
          const { line } = ts.getLineAndCharacterOfPosition(
            sourceFile,
            statement.end - addedTextLength
          );

          const endOfLine = activeEditor.document.lineAt(line).range.end;

          const statementName =
            statement?.name?.text || statement?.name?.escapedText;

          const contentText = `${prefix} ${statementName}`;

          let accommodator = 0;
          if (nodes[index + 1]) {
            accommodator = 1;
          }

          if (
            line - startLine >= minDistance &&
            children.length &&
            statementName
          ) {
            decorations.push({
              range: new vscode.Range(
                activeEditor.document.positionAt(
                  statement.end - addedTextLength + accommodator
                ),
                endOfLine
              ),
              renderOptions: {
                after: {
                  contentText,
                },
              },
            });
          }
        });

        nodes = [...children];
        children = [];
      }
      return decorations;
    },
  }
);
