import React, { ReactNode, useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { Portal } from 'react-native-paper';

type BodyPortalProps = {
  children: ReactNode;
};

export default function BodyPortal({ children }: BodyPortalProps) {
  const [portalContainer, setPortalContainer] = useState<Element | null>(null);

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') {
      return;
    }

    const hostElement = document.createElement('div');
    hostElement.setAttribute('data-storage-body-portal', 'true');
    document.body.appendChild(hostElement);
    setPortalContainer(hostElement);

    return () => {
      if (hostElement.parentNode) {
        hostElement.parentNode.removeChild(hostElement);
      }
    };
  }, []);

  if (Platform.OS !== 'web') {
    return <Portal>{children}</Portal>;
  }

  if (!portalContainer) {
    return null;
  }

  const reactDom = require('react-dom') as typeof import('react-dom');
  return reactDom.createPortal(children, portalContainer);
}
