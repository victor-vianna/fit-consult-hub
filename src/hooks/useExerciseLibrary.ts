import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

export function useExerciseLibrary() {
  const navigate = useNavigate();

  const abrirExercicioNaBiblioteca = (nomeExercicio: string) => {
    navigate("/biblioteca", {
      state: { searchTerm: nomeExercicio }
    });
    
    toast.info(`🔍 Buscando "${nomeExercicio}" na biblioteca...`, {
      duration: 2000
    });
  };

  return { abrirExercicioNaBiblioteca };
}
