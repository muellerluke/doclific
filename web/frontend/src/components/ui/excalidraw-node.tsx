

import type { TExcalidrawElement } from '@platejs/excalidraw';
import type { PlateElementProps } from 'platejs/react';

import { useExcalidrawElement } from '@platejs/excalidraw/react';
import { PlateElement, useReadOnly } from 'platejs/react';

import '@excalidraw/excalidraw/index.css';

export function ExcalidrawElement(
  props: PlateElementProps<TExcalidrawElement>
) {
  const { children, element } = props;
  const readOnly = useReadOnly();

  const { Excalidraw, excalidrawProps } = useExcalidrawElement({
    element,
  });

  return (
    <PlateElement {...props}>
      <div contentEditable={false}>
        <div className="mx-auto aspect-video h-[600px] w-full overflow-hidden rounded-sm border">
          {Excalidraw && (
            <Excalidraw
              {...(excalidrawProps as any)}
              viewModeEnabled={readOnly}
            />
          )}
        </div>
      </div>
      {children}
    </PlateElement>
  );
}
