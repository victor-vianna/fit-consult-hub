import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accessibility, Camera, Eye, HeartPulse, TrendingUp, Weight } from "lucide-react";
import { FotosSection } from "./FotosSection";
import { EvolucaoSection } from "./EvolucaoSection";
import { ComposicaoCorporalSection } from "./ComposicaoCorporalSection";
import { FlexibilidadeSection } from "./FlexibilidadeSection";
import { PosturalSection } from "./PosturalSection";
import { CardiorrespiratorioSection } from "./CardiorrespiratorioSection";

interface Props {
  profileId: string;
  personalId: string;
  themeColor?: string;
}

export function AvaliacaoHub({ profileId, personalId, themeColor }: Props) {
  const [activeSubTab, setActiveSubTab] = useState("fotos");
  const [refreshKey, setRefreshKey] = useState(0);

  const handleRefresh = () => setRefreshKey((key) => key + 1);

  return (
    <div className="space-y-4">
      <Tabs value={activeSubTab} onValueChange={setActiveSubTab}>
        <div className="overflow-x-auto scrollbar-hide">
          <TabsList className="inline-flex h-auto w-auto min-w-full gap-1 bg-muted/50 p-1">
            <TabsTrigger value="fotos" className="flex-shrink-0 gap-1.5 px-3 py-2 text-xs sm:text-sm">
              <Camera className="h-4 w-4" />
              <span className="hidden sm:inline">Fotos</span>
            </TabsTrigger>
            <TabsTrigger value="evolucao" className="flex-shrink-0 gap-1.5 px-3 py-2 text-xs sm:text-sm">
              <TrendingUp className="h-4 w-4" />
              <span className="hidden sm:inline">Evolucao</span>
            </TabsTrigger>
            <TabsTrigger value="composicao" className="flex-shrink-0 gap-1.5 px-3 py-2 text-xs sm:text-sm">
              <Weight className="h-4 w-4" />
              <span className="hidden sm:inline">Composicao</span>
            </TabsTrigger>
            <TabsTrigger value="flexibilidade" className="flex-shrink-0 gap-1.5 px-3 py-2 text-xs sm:text-sm">
              <Accessibility className="h-4 w-4" />
              <span className="hidden sm:inline">Flexibilidade</span>
            </TabsTrigger>
            <TabsTrigger value="cardio" className="flex-shrink-0 gap-1.5 px-3 py-2 text-xs sm:text-sm">
              <HeartPulse className="h-4 w-4" />
              <span className="hidden sm:inline">Cardio</span>
            </TabsTrigger>
            <TabsTrigger value="postural" className="flex-shrink-0 gap-1.5 px-3 py-2 text-xs sm:text-sm">
              <Eye className="h-4 w-4" />
              <span className="hidden sm:inline">Postural</span>
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="fotos">
          <FotosSection
            profileId={profileId}
            personalId={personalId}
            themeColor={themeColor}
            refreshKey={refreshKey}
            onRefresh={handleRefresh}
          />
        </TabsContent>
        <TabsContent value="evolucao">
          <EvolucaoSection profileId={profileId} personalId={personalId} themeColor={themeColor} />
        </TabsContent>
        <TabsContent value="composicao">
          <ComposicaoCorporalSection
            profileId={profileId}
            personalId={personalId}
            themeColor={themeColor}
            onRefresh={handleRefresh}
          />
        </TabsContent>
        <TabsContent value="flexibilidade">
          <FlexibilidadeSection
            profileId={profileId}
            personalId={personalId}
            themeColor={themeColor}
            onRefresh={handleRefresh}
          />
        </TabsContent>
        <TabsContent value="cardio">
          <CardiorrespiratorioSection
            profileId={profileId}
            personalId={personalId}
            themeColor={themeColor}
            onRefresh={handleRefresh}
          />
        </TabsContent>
        <TabsContent value="postural">
          <PosturalSection
            profileId={profileId}
            personalId={personalId}
            themeColor={themeColor}
            onRefresh={handleRefresh}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
