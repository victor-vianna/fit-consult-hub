import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accessibility, Camera, Eye, HeartPulse, TrendingUp, Weight } from "lucide-react";
import { usePersistedState } from "@/hooks/usePersistedState";
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

const ASSESSMENT_TABS = ["fotos", "evolucao", "composicao", "flexibilidade", "cardio", "postural"] as const;
type AssessmentTab = (typeof ASSESSMENT_TABS)[number];

function isAssessmentTab(value: string | null): value is AssessmentTab {
  return Boolean(value && ASSESSMENT_TABS.includes(value as AssessmentTab));
}

export function AvaliacaoHub({ profileId, personalId, themeColor }: Props) {
  const [searchParams, setSearchParams] = useSearchParams();
  const urlSubTab = searchParams.get("avaliacaoTab");
  const initialSubTab: AssessmentTab = isAssessmentTab(urlSubTab) ? urlSubTab : "fotos";
  const [activeSubTab, setActiveSubTab] = usePersistedState<AssessmentTab>(
    `avaliacao-subtab:${profileId}`,
    initialSubTab,
    { storage: "session", version: 1 }
  );
  const [refreshKey, setRefreshKey] = useState(0);

  const handleRefresh = () => setRefreshKey((key) => key + 1);
  const handleSubTabChange = (value: string) => {
    if (!isAssessmentTab(value)) return;
    setActiveSubTab(value);
    setSearchParams((current) => {
      const params = new URLSearchParams(current);
      params.set("tab", "avaliacao");
      params.set("avaliacaoTab", value);
      return params;
    }, { replace: true });
  };

  useEffect(() => {
    if (isAssessmentTab(urlSubTab) && urlSubTab !== activeSubTab) {
      setActiveSubTab(urlSubTab);
    }
  }, [activeSubTab, setActiveSubTab, urlSubTab]);

  return (
    <div className="space-y-4">
      <Tabs value={activeSubTab} onValueChange={handleSubTabChange}>
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
