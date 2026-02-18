import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Camera, TrendingUp, Weight, Ruler, Accessibility, Eye, ShieldCheck } from "lucide-react";
import { FotosSection } from "./FotosSection";
import { EvolucaoSection } from "./EvolucaoSection";
import { ComposicaoCorporalSection } from "./ComposicaoCorporalSection";
import { AvaliacaoFisicaSection } from "./AvaliacaoFisicaSection";
import { FlexibilidadeSection } from "./FlexibilidadeSection";
import { PosturalSection } from "./PosturalSection";
import { TriagemSection } from "./TriagemSection";

interface Props {
  profileId: string;
  personalId: string;
  themeColor?: string;
}

export function AvaliacaoHub({ profileId, personalId, themeColor }: Props) {
  const [activeSubTab, setActiveSubTab] = useState("fotos");
  const [refreshKey, setRefreshKey] = useState(0);

  const handleRefresh = () => setRefreshKey((k) => k + 1);

  return (
    <div className="space-y-4">
      <Tabs value={activeSubTab} onValueChange={setActiveSubTab}>
        <div className="overflow-x-auto scrollbar-hide">
          <TabsList className="inline-flex w-auto min-w-full gap-1 bg-muted/50 p-1 h-auto">
            <TabsTrigger value="fotos" className="flex-shrink-0 px-3 py-2 text-xs sm:text-sm gap-1.5">
              <Camera className="h-4 w-4" />
              <span className="hidden sm:inline">Fotos</span>
            </TabsTrigger>
            <TabsTrigger value="evolucao" className="flex-shrink-0 px-3 py-2 text-xs sm:text-sm gap-1.5">
              <TrendingUp className="h-4 w-4" />
              <span className="hidden sm:inline">Evolução</span>
            </TabsTrigger>
            <TabsTrigger value="composicao" className="flex-shrink-0 px-3 py-2 text-xs sm:text-sm gap-1.5">
              <Weight className="h-4 w-4" />
              <span className="hidden sm:inline">Composição</span>
            </TabsTrigger>
            <TabsTrigger value="avaliacao" className="flex-shrink-0 px-3 py-2 text-xs sm:text-sm gap-1.5">
              <Ruler className="h-4 w-4" />
              <span className="hidden sm:inline">Medidas</span>
            </TabsTrigger>
            <TabsTrigger value="flexibilidade" className="flex-shrink-0 px-3 py-2 text-xs sm:text-sm gap-1.5">
              <Accessibility className="h-4 w-4" />
              <span className="hidden sm:inline">Flexibilidade</span>
            </TabsTrigger>
            <TabsTrigger value="postural" className="flex-shrink-0 px-3 py-2 text-xs sm:text-sm gap-1.5">
              <Eye className="h-4 w-4" />
              <span className="hidden sm:inline">Postural</span>
            </TabsTrigger>
            <TabsTrigger value="triagem" className="flex-shrink-0 px-3 py-2 text-xs sm:text-sm gap-1.5">
              <ShieldCheck className="h-4 w-4" />
              <span className="hidden sm:inline">Triagem</span>
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="fotos">
          <FotosSection profileId={profileId} personalId={personalId} themeColor={themeColor} refreshKey={refreshKey} onRefresh={handleRefresh} />
        </TabsContent>
        <TabsContent value="evolucao">
          <EvolucaoSection profileId={profileId} personalId={personalId} themeColor={themeColor} />
        </TabsContent>
        <TabsContent value="composicao">
          <ComposicaoCorporalSection profileId={profileId} personalId={personalId} themeColor={themeColor} onRefresh={handleRefresh} />
        </TabsContent>
        <TabsContent value="avaliacao">
          <AvaliacaoFisicaSection profileId={profileId} personalId={personalId} themeColor={themeColor} onRefresh={handleRefresh} />
        </TabsContent>
        <TabsContent value="flexibilidade">
          <FlexibilidadeSection profileId={profileId} personalId={personalId} themeColor={themeColor} />
        </TabsContent>
        <TabsContent value="postural">
          <PosturalSection profileId={profileId} personalId={personalId} themeColor={themeColor} />
        </TabsContent>
        <TabsContent value="triagem">
          <TriagemSection profileId={profileId} personalId={personalId} themeColor={themeColor} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
