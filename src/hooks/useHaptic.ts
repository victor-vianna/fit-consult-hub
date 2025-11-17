/**
 * Hook para fornecer feedback háptico em dispositivos móveis
 * Melhora a experiência do usuário em dispositivos com suporte a vibração
 */
export function useHaptic() {
  /**
   * Dispara uma vibração no dispositivo se suportado
   * @param duration - Duração da vibração em milissegundos (padrão: 10ms)
   */
  const vibrate = (duration: number = 10) => {
    if ("vibrate" in navigator && navigator.vibrate) {
      try {
        navigator.vibrate(duration);
      } catch (error) {
        // Silenciosamente falha em dispositivos sem suporte
        console.debug("Haptic feedback not supported");
      }
    }
  };

  /**
   * Padrões de vibração pré-definidos
   */
  const patterns = {
    light: () => vibrate(10),      // Toque leve
    medium: () => vibrate(20),     // Toque médio
    heavy: () => vibrate(30),      // Toque pesado
    success: () => {
      if ("vibrate" in navigator && navigator.vibrate) {
        navigator.vibrate([10, 50, 10]);
      }
    },
    error: () => {
      if ("vibrate" in navigator && navigator.vibrate) {
        navigator.vibrate([50, 30, 50]);
      }
    },
    warning: () => {
      if ("vibrate" in navigator && navigator.vibrate) {
        navigator.vibrate([20, 40, 20]);
      }
    },
  };

  return { 
    vibrate, 
    ...patterns 
  };
}
