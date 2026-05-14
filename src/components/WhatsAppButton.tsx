import { MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface WhatsAppButtonProps {
  telefone: string;
  nome: string;
  /** Se verdadeiro, exibe apenas o ícone (útil no mobile/cabeçalhos compactos). */
  iconOnly?: boolean;
  className?: string;
  size?: 'sm' | 'default' | 'lg' | 'icon';
}

export function WhatsAppButton({
  telefone,
  nome,
  iconOnly = false,
  className,
  size = 'default',
}: WhatsAppButtonProps) {
  const handleWhatsAppClick = () => {
    const numeroLimpo = telefone.replace(/\D/g, '');
    const mensagem = encodeURIComponent(`Olá ${nome}, tudo bem?`);
    const url = `https://wa.me/55${numeroLimpo}?text=${mensagem}`;
    window.open(url, '_blank');
  };

  if (iconOnly) {
    return (
      <Button
        onClick={handleWhatsAppClick}
        variant="outline"
        size="icon"
        aria-label={`Contatar ${nome} via WhatsApp`}
        title={`Contatar ${nome} via WhatsApp`}
        className={cn('min-h-[44px] min-w-[44px]', className)}
      >
        <MessageCircle className="h-5 w-5" />
      </Button>
    );
  }

  return (
    <Button
      onClick={handleWhatsAppClick}
      variant="outline"
      size={size}
      className={cn('gap-2 min-h-[44px]', className)}
      aria-label={`Contatar ${nome} via WhatsApp`}
    >
      <MessageCircle className="h-4 w-4" />
      {/* No mobile mostramos só "WhatsApp", no desktop a ação completa */}
      <span className="hidden sm:inline">Contatar via WhatsApp</span>
      <span className="sm:hidden">WhatsApp</span>
    </Button>
  );
}
