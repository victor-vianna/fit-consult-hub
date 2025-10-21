import { MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface WhatsAppButtonProps {
  telefone: string;
  nome: string;
}

export function WhatsAppButton({ telefone, nome }: WhatsAppButtonProps) {
  const handleWhatsAppClick = () => {
    const numeroLimpo = telefone.replace(/\D/g, '');
    const mensagem = encodeURIComponent(`Olá ${nome}, tudo bem?`);
    const url = `https://wa.me/55${numeroLimpo}?text=${mensagem}`;
    window.open(url, '_blank');
  };

  return (
    <Button onClick={handleWhatsAppClick} variant="outline" className="gap-2">
      <MessageCircle className="h-4 w-4" />
      Contatar via WhatsApp
    </Button>
  );
}
