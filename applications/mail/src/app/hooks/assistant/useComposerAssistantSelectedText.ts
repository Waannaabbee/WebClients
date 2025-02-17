import type { RefObject } from 'react';
import { useEffect, useRef, useState } from 'react';

import { useComposerAssistantProvider } from 'proton-mail/components/assistant/provider/ComposerAssistantProvider';

interface Props {
    assistantResultRef: RefObject<HTMLDivElement>;
    inputSelectedText?: string;
    onResetRequest?: () => void;
    assistantID: string;
}
const useComposerAssistantSelectedText = ({
    assistantID,
    assistantResultRef,
    inputSelectedText,
    onResetRequest,
}: Props) => {
    // Selected text in the composer or assistant result that the user might want to refine
    const [selectedText, setSelectedText] = useState(inputSelectedText);
    const prevSelectionRef = useRef<string>('');

    const { assistantRefManager } = useComposerAssistantProvider();

    const [displayRefinePopover, setDisplayRefinePopover] = useState<boolean>(false);

    const mouseDownRef = useRef(false);

    const handleSelectionChange = () => {
        setTimeout(() => {
            const selection = document.getSelection();
            if (selection && assistantResultRef.current) {
                // Selection can start before or end after the div containing the result
                // We want to make sure the full selected text is inside the result container
                const selectionInAssistant =
                    assistantResultRef.current.contains(selection.anchorNode) &&
                    assistantResultRef.current.contains(selection.focusNode);
                const selectionText = selection.toString().trim();

                if (selectionInAssistant && prevSelectionRef.current !== selectionText) {
                    setSelectedText(selectionText);
                    onResetRequest?.();
                    return;
                }
            }
            setSelectedText('');
        }, 0);
    };

    const handleMouseDown = () => {
        mouseDownRef.current = true;
    };

    // Listen mouse up at document lvl to handle the case when the user clicks
    // outside the assistant
    useEffect(() => {
        const handleMouseUp = (e: any) => {
            const inputContainerElement = assistantRefManager.container.get(assistantID);

            if (mouseDownRef.current) {
                mouseDownRef.current = false;
                // Do not reset the selection if user clicks in the input container
                if (inputContainerElement.current?.contains(e.target)) {
                    return;
                }
                handleSelectionChange();
            }
        };
        document.addEventListener('mouseup', handleMouseUp);

        return () => {
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, []);

    // Controls the popover display
    useEffect(() => {
        if (selectedText && !displayRefinePopover) {
            setDisplayRefinePopover(true);
        } else if (!selectedText) {
            setDisplayRefinePopover(false);
        }
    }, [selectedText, displayRefinePopover]);

    // Update selected text when selection in editor is changing,
    // and hide the refine popover when the user deselect content in the editor.
    useEffect(() => {
        setSelectedText(inputSelectedText);
        if (inputSelectedText) {
            setDisplayRefinePopover(true);
        }
    }, [inputSelectedText]);

    const handleCloseRefinePopover = () => {
        // Make a real clear selection on the UI so that we re-trigger the selection change and set selected text to ""
        document.getSelection()?.removeAllRanges();
        setDisplayRefinePopover(false);
    };

    return {
        selectedText,
        setSelectedText,
        handleMouseDown,
        handleCloseRefinePopover,
        handleSelectionChange,
        displayRefinePopover,
    };
};

export default useComposerAssistantSelectedText;
