// src/components/FloatingButtonListener.tsx
// Componente invisible que solo monta el hook para que el listener esté activo

import { useFloatingButton } from '../hooks/useFloatingButton';

export default function FloatingButtonListener() {
  // Solo montar el hook, no renderizar nada
  useFloatingButton();
  
  // No renderizar nada visible
  return null;
}