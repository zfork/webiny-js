import React from "react";
import Block from "./Block";
import {
    CreateElementActionEvent,
    DeleteElementActionEvent,
    updateElementAction
} from "@webiny/app-page-builder/editor/recoil/actions";
import { EventActionHandlerActionCallableResponseType } from "@webiny/app-page-builder/editor/recoil/eventActions";
import {
    addElementToParentHelper,
    createDroppedElementHelper
} from "@webiny/app-page-builder/editor/helpers";
import { PbEditorPageElementPlugin, PbElement } from "@webiny/app-page-builder/types";

export default (): PbEditorPageElementPlugin => {
    return {
        name: "pb-editor-page-element-block",
        type: "pb-editor-page-element",
        elementType: "block",
        settings: [
            "pb-editor-page-element-style-settings-background",
            "pb-editor-page-element-style-settings-animation",
            "pb-editor-page-element-style-settings-border",
            "pb-editor-page-element-style-settings-shadow",
            "pb-editor-page-element-style-settings-padding",
            "pb-editor-page-element-style-settings-margin",
            "pb-editor-page-element-style-settings-width",
            "pb-editor-page-element-style-settings-height",
            "pb-editor-page-element-style-settings-horizontal-align-flex",
            "pb-editor-page-element-style-settings-vertical-align",
            "pb-editor-page-element-settings-clone",
            "pb-editor-page-element-settings-delete"
        ],
        create(options = {}) {
            return {
                type: "block",
                elements: [],
                data: {
                    settings: {
                        width: { value: "1000px" },
                        margin: {
                            mobile: { top: 15, left: 15, right: 15, bottom: 15 },
                            desktop: { top: 25, left: 0, right: 0, bottom: 25 },
                            advanced: true
                        },
                        padding: {
                            mobile: { all: 10 },
                            desktop: { all: 0 }
                        }
                    }
                },
                ...options
            };
        },
        render(props) {
            return <Block {...props} />;
        },
        // This callback is executed when another element is dropped on the drop zones with type "block"
        onReceived({ source, target, position = null, state, meta }) {
            const { element, dispatchCreateElementAction = false } = createDroppedElementHelper(
                source as any,
                target
            );

            const block = addElementToParentHelper(element, target, position);

            const result = updateElementAction(state, meta, {
                element: block
            }) as EventActionHandlerActionCallableResponseType;

            if (source.path) {
                result.actions.push(
                    new DeleteElementActionEvent({
                        element: source as PbElement
                    })
                );
            }

            if (!dispatchCreateElementAction) {
                return result;
            }
            result.actions.push(
                new CreateElementActionEvent({
                    element,
                    source: source as PbElement
                })
            );
            return result;
        }
    };
};
