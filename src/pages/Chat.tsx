import { useEffect, useMemo, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import {
  ArrowLeft,
  CheckCheck,
  Mail,
  MailOpen,
  MessageSquare,
  MoreVertical,
  Pin,
  Search,
  Star,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppLayout } from "@/components/AppLayout";
import { AppSidebarPersonal } from "@/components/AppSidebarPersonal";
import { BroadcastMessageDialog } from "@/components/chat/BroadcastMessageDialog";
import { ChatPanel } from "@/components/chat/ChatPanel";
import { MobileHeaderPersonal } from "@/components/mobile/MobileHeaderPersonal";
import { BottomNavigationPersonal } from "@/components/mobile/BottomNavigationPersonal";
import { NotificacoesDropdown } from "@/components/NotificacoesDropdown";
import { PersonalSettingsDialog } from "@/components/PersonalSettingsDialog";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useAuth } from "@/hooks/useAuth";
import { usePersonalSettings } from "@/hooks/usePersonalSettings";
import { usePersistedState } from "@/hooks/usePersistedState";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface Student {
  id: string;
  nome: string;
  email: string;
  telefone: string | null;
  is_active: boolean;
}

interface MessagePreview {
  id: string;
  conversa_key: string;
  remetente_id: string;
  destinatario_id: string;
  conteudo: string;
  lida: boolean | null;
  created_at: string;
  deleted_for_all?: boolean | null;
}

interface ConversationItem extends Student {
  lastMessage: MessagePreview | null;
  unread: number;
  isFavorite: boolean;
  isPinned: boolean;
  isManualUnread: boolean;
}

type InboxFilter = "all" | "unread" | "favorites" | "pinned";

export default function Chat() {
  const { user, signOut } = useAuth();
  const [searchParams] = useSearchParams();
  const { settings: personalSettings } = usePersonalSettings(user?.id);
  const [profile, setProfile] = useState<any>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [messages, setMessages] = useState<MessagePreview[]>([]);
  const [selectedAlunoId, setSelectedAlunoId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [isMobile, setIsMobile] = useState(false);
  const [filter, setFilter] = useState<InboxFilter>("all");
  const [favoriteIds, setFavoriteIds] = usePersistedState<string[]>(
    `chat-favorites:${user?.id || "anon"}`,
    [],
    { storage: "local" }
  );
  const [pinnedIds, setPinnedIds] = usePersistedState<string[]>(
    `chat-pinned:${user?.id || "anon"}`,
    [],
    { storage: "local" }
  );
  const [manualUnreadIds, setManualUnreadIds] = usePersistedState<string[]>(
    `chat-manual-unread:${user?.id || "anon"}`,
    [],
    { storage: "local" }
  );
  const selectedAlunoStorageKey = useMemo(
    () => (user?.id ? `pf:chat-selected-aluno:${user.id}:v1` : null),
    [user?.id]
  );
  const alunoIdFromUrl = searchParams.get("aluno");

  const readStoredSelectedAlunoId = () => {
    if (!selectedAlunoStorageKey || typeof window === "undefined") return null;
    try {
      return window.localStorage.getItem(selectedAlunoStorageKey);
    } catch {
      return null;
    }
  };

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  useEffect(() => {
    if (!selectedAlunoStorageKey || !selectedAlunoId || typeof window === "undefined") return;
    try {
      window.localStorage.setItem(selectedAlunoStorageKey, selectedAlunoId);
    } catch {
      // cache best-effort
    }
  }, [selectedAlunoStorageKey, selectedAlunoId]);

  useEffect(() => {
    if (!alunoIdFromUrl) return;
    if (students.some((student) => student.id === alunoIdFromUrl)) {
      setSelectedAlunoId(alunoIdFromUrl);
      setManualUnreadIds((prev) => prev.filter((id) => id !== alunoIdFromUrl));
    }
  }, [alunoIdFromUrl, setManualUnreadIds, students]);

  useEffect(() => {
    if (!user?.id) return;
    fetchData();

    const channel = supabase
      .channel(`personal-chat-inbox:${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "mensagens_chat",
        },
        () => fetchMessages()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  const fetchData = async () => {
    if (!user?.id) return;

    const [{ data: profileData }, { data: studentData }] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", user.id).single(),
      supabase
        .from("profiles")
        .select("id, nome, email, telefone, is_active")
        .eq("personal_id", user.id)
        .order("nome"),
    ]);

    const fetchedStudents = (studentData || []) as Student[];
    const storedAlunoId = readStoredSelectedAlunoId();
    const nextSelectedAlunoId =
      (alunoIdFromUrl && fetchedStudents.some((student) => student.id === alunoIdFromUrl)
        ? alunoIdFromUrl
        : null) ||
      (selectedAlunoId && fetchedStudents.some((student) => student.id === selectedAlunoId)
        ? selectedAlunoId
        : null) ||
      (storedAlunoId && fetchedStudents.some((student) => student.id === storedAlunoId)
        ? storedAlunoId
        : null) ||
      fetchedStudents[0]?.id ||
      null;

    setProfile(profileData);
    setStudents(fetchedStudents);
    if (nextSelectedAlunoId && nextSelectedAlunoId !== selectedAlunoId) {
      setSelectedAlunoId(nextSelectedAlunoId);
    }
    await fetchMessages();
  };

  const fetchMessages = async () => {
    if (!user?.id) return;

    const { data } = await supabase
      .from("mensagens_chat")
      .select("id, conversa_key, remetente_id, destinatario_id, conteudo, lida, created_at, deleted_for_all")
      .like("conversa_key", `${user.id}::%`)
      .order("created_at", { ascending: false })
      .limit(500);

    setMessages((data || []) as MessagePreview[]);
  };

  const conversations = useMemo<ConversationItem[]>(() => {
    const byStudent = new Map<string, { lastMessage: MessagePreview | null; unread: number }>();

    for (const msg of messages) {
      const alunoId = msg.conversa_key.split("::")[1];
      if (!alunoId) continue;
      const current = byStudent.get(alunoId) || { lastMessage: null, unread: 0 };
      if (!current.lastMessage) current.lastMessage = msg;
      if (msg.destinatario_id === user?.id && !msg.lida) current.unread += 1;
      byStudent.set(alunoId, current);
    }

    return students
      .map((student) => ({
        ...student,
        lastMessage: byStudent.get(student.id)?.lastMessage || null,
        unread: byStudent.get(student.id)?.unread || 0,
        isFavorite: favoriteIds.includes(student.id),
        isPinned: pinnedIds.includes(student.id),
        isManualUnread: manualUnreadIds.includes(student.id),
      }))
      .filter((item) => {
        const term = search.trim().toLowerCase();
        const matchesSearch =
          !term ||
          item.nome.toLowerCase().includes(term) ||
          item.email.toLowerCase().includes(term) ||
          !!item.lastMessage?.conteudo.toLowerCase().includes(term);
        if (!matchesSearch) return false;
        if (filter === "unread") return item.unread > 0 || item.isManualUnread;
        if (filter === "favorites") return item.isFavorite;
        if (filter === "pinned") return item.isPinned;
        return true;
      })
      .sort((a, b) => {
        if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
        if (a.unread !== b.unread) return b.unread - a.unread;
        const aTime = a.lastMessage?.created_at ? new Date(a.lastMessage.created_at).getTime() : 0;
        const bTime = b.lastMessage?.created_at ? new Date(b.lastMessage.created_at).getTime() : 0;
        return bTime - aTime;
      });
  }, [messages, students, search, user?.id, favoriteIds, pinnedIds, manualUnreadIds, filter]);

  const allConversations = useMemo<ConversationItem[]>(() => {
    const byStudent = new Map<string, { lastMessage: MessagePreview | null; unread: number }>();
    for (const msg of messages) {
      const alunoId = msg.conversa_key.split("::")[1];
      if (!alunoId) continue;
      const current = byStudent.get(alunoId) || { lastMessage: null, unread: 0 };
      if (!current.lastMessage) current.lastMessage = msg;
      if (msg.destinatario_id === user?.id && !msg.lida) current.unread += 1;
      byStudent.set(alunoId, current);
    }

    return students.map((student) => ({
      ...student,
      lastMessage: byStudent.get(student.id)?.lastMessage || null,
      unread: byStudent.get(student.id)?.unread || 0,
      isFavorite: favoriteIds.includes(student.id),
      isPinned: pinnedIds.includes(student.id),
      isManualUnread: manualUnreadIds.includes(student.id),
    }));
  }, [messages, students, user?.id, favoriteIds, pinnedIds, manualUnreadIds]);

  const selectedStudent =
    conversations.find((item) => item.id === selectedAlunoId) ||
    students.find((item) => item.id === selectedAlunoId) ||
    null;

  const filterCounts = useMemo(
    () => ({
      all: allConversations.length,
      unread: allConversations.filter((item) => item.unread > 0 || item.isManualUnread).length,
      favorites: allConversations.filter((item) => item.isFavorite).length,
      pinned: allConversations.filter((item) => item.isPinned).length,
    }),
    [allConversations]
  );

  const toggleId = (
    id: string,
    setter: Dispatch<SetStateAction<string[]>>
  ) => {
    setter((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const selectConversation = (studentId: string) => {
    setSelectedAlunoId(studentId);
    setManualUnreadIds((prev) => prev.filter((id) => id !== studentId));
  };

  const markConversationUnread = async (studentId: string) => {
    setManualUnreadIds((prev) => (prev.includes(studentId) ? prev : [...prev, studentId]));

    const latestIncoming = messages.find(
      (msg) =>
        msg.conversa_key === `${user?.id}::${studentId}` &&
        msg.destinatario_id === user?.id &&
        !msg.deleted_for_all
    );

    if (!latestIncoming || !user?.id) return;

    await supabase
      .from("mensagens_chat")
      .update({ lida: false })
      .eq("id", latestIncoming.id)
      .eq("destinatario_id", user.id);

    setMessages((prev) =>
      prev.map((msg) => (msg.id === latestIncoming.id ? { ...msg, lida: false } : msg))
    );
  };

  const markConversationRead = async (studentId: string) => {
    setManualUnreadIds((prev) => prev.filter((id) => id !== studentId));
    if (!user?.id) return;

    await supabase
      .from("mensagens_chat")
      .update({ lida: true })
      .eq("conversa_key", `${user.id}::${studentId}`)
      .eq("destinatario_id", user.id)
      .eq("lida", false);

    setMessages((prev) =>
      prev.map((msg) =>
        msg.conversa_key === `${user.id}::${studentId}` && msg.destinatario_id === user.id
          ? { ...msg, lida: true }
          : msg
      )
    );
  };

  const filterItems: { id: InboxFilter; label: string; count: number }[] = [
    { id: "all", label: "Todos", count: filterCounts.all },
    { id: "unread", label: "Nao lidas", count: filterCounts.unread },
    { id: "favorites", label: "Favoritos", count: filterCounts.favorites },
    { id: "pinned", label: "Fixadas", count: filterCounts.pinned },
  ];

  const content = (
    <div className="container mx-auto max-w-7xl px-4 py-4 md:py-6">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold md:text-2xl">Chat</h1>
          <p className="text-sm text-muted-foreground">
            Todas as conversas com alunos em um unico lugar.
          </p>
        </div>
        {user?.id && (
          <BroadcastMessageDialog
            personalId={user.id}
            themeColor={personalSettings?.theme_color}
          />
        )}
      </div>

      <div className="grid min-h-[620px] overflow-hidden rounded-lg border bg-background md:grid-cols-[340px_minmax(0,1fr)]">
        <aside
          className={cn(
            "border-r bg-card",
            isMobile && selectedStudent ? "hidden" : "block"
          )}
        >
          <div className="border-b p-3">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar aluno ou mensagem"
                className="pl-9"
              />
            </div>
            <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
              {filterItems.map((item) => (
                <Button
                  key={item.id}
                  type="button"
                  variant={filter === item.id ? "default" : "outline"}
                  size="sm"
                  className="h-8 shrink-0 rounded-full px-3 text-xs"
                  onClick={() => setFilter(item.id)}
                  style={
                    filter === item.id && personalSettings?.theme_color
                      ? { backgroundColor: personalSettings.theme_color }
                      : undefined
                  }
                >
                  {item.label}
                  {item.count > 0 && (
                    <span
                      className={cn(
                        "ml-1.5 rounded-full px-1.5 text-[10px]",
                        filter === item.id
                          ? "bg-primary-foreground/20 text-primary-foreground"
                          : "bg-muted text-muted-foreground"
                      )}
                    >
                      {item.count > 99 ? "99+" : item.count}
                    </span>
                  )}
                </Button>
              ))}
            </div>
          </div>

          <div className="max-h-[620px] overflow-y-auto">
            {conversations.length === 0 ? (
              <div className="p-6 text-center text-sm text-muted-foreground">
                Nenhuma conversa encontrada.
              </div>
            ) : (
              conversations.map((conversation) => (
                <div
                  key={conversation.id}
                  className={cn(
                    "group flex w-full items-center gap-3 border-b px-3 py-3 text-left transition-colors hover:bg-muted/60",
                    selectedAlunoId === conversation.id && "bg-muted"
                  )}
                >
                  <button
                    type="button"
                    onClick={() => selectConversation(conversation.id)}
                    className="flex min-w-0 flex-1 items-center gap-3 text-left"
                  >
                    <div className="relative shrink-0">
                      <div
                        className="flex h-11 w-11 items-center justify-center rounded-full text-sm font-bold text-white"
                        style={{
                          backgroundColor:
                            personalSettings?.theme_color || "hsl(var(--primary))",
                        }}
                      >
                        {getInitials(conversation.nome)}
                      </div>
                      {conversation.isFavorite && (
                        <span className="absolute -bottom-1 -right-1 rounded-full border bg-background p-0.5 text-amber-500">
                          <Star className="h-3 w-3 fill-current" />
                        </span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex min-w-0 items-center gap-1.5">
                          <p
                            className={cn(
                              "truncate text-sm",
                              conversation.unread > 0 || conversation.isManualUnread
                                ? "font-bold"
                                : "font-semibold"
                            )}
                          >
                            {conversation.nome}
                          </p>
                          {conversation.isPinned && (
                            <Pin className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                          )}
                        </div>
                        {conversation.lastMessage && (
                          <span
                            className={cn(
                              "shrink-0 text-[10px]",
                              conversation.unread > 0 || conversation.isManualUnread
                                ? "font-semibold text-primary"
                                : "text-muted-foreground"
                            )}
                          >
                            {formatDistanceToNow(new Date(conversation.lastMessage.created_at), {
                              addSuffix: true,
                              locale: ptBR,
                            })}
                          </span>
                        )}
                      </div>
                      <div className="mt-0.5 flex items-center gap-2">
                        <p
                          className={cn(
                            "min-w-0 flex-1 truncate text-xs",
                            conversation.unread > 0 || conversation.isManualUnread
                              ? "font-medium text-foreground"
                              : "text-muted-foreground"
                          )}
                        >
                          {conversation.lastMessage
                            ? conversation.lastMessage.deleted_for_all
                              ? "Mensagem apagada"
                              : conversation.lastMessage.conteudo
                            : "Sem mensagens ainda"}
                        </p>
                        {(conversation.unread > 0 || conversation.isManualUnread) && (
                          <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-bold text-primary-foreground">
                            {conversation.unread > 0
                              ? conversation.unread > 9
                                ? "9+"
                                : conversation.unread
                              : "•"}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 shrink-0 rounded-full opacity-70 md:opacity-0 md:group-hover:opacity-100"
                      >
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() =>
                          conversation.unread > 0 || conversation.isManualUnread
                            ? markConversationRead(conversation.id)
                            : markConversationUnread(conversation.id)
                        }
                      >
                        {conversation.unread > 0 || conversation.isManualUnread ? (
                          <>
                            <MailOpen className="mr-2 h-4 w-4" />
                            Marcar como lida
                          </>
                        ) : (
                          <>
                            <Mail className="mr-2 h-4 w-4" />
                            Marcar como nao lida
                          </>
                        )}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => toggleId(conversation.id, setFavoriteIds)}>
                        <Star
                          className={cn(
                            "mr-2 h-4 w-4",
                            conversation.isFavorite && "fill-current text-amber-500"
                          )}
                        />
                        {conversation.isFavorite ? "Remover dos favoritos" : "Favoritar conversa"}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => toggleId(conversation.id, setPinnedIds)}>
                        <Pin
                          className={cn(
                            "mr-2 h-4 w-4",
                            conversation.isPinned && "fill-current text-primary"
                          )}
                        />
                        {conversation.isPinned ? "Desafixar conversa" : "Fixar conversa"}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => markConversationRead(conversation.id)}>
                        <CheckCheck className="mr-2 h-4 w-4" />
                        Marcar tudo como lido
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ))
            )}
          </div>
        </aside>

        <section className={cn("min-w-0", isMobile && !selectedStudent ? "hidden" : "block")}>
          {selectedStudent && user?.id ? (
            <div className="flex h-full flex-col">
              {isMobile && (
                <div className="border-b p-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedAlunoId(null)}
                  >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Conversas
                  </Button>
                </div>
              )}
              <ChatPanel
                personalId={user.id}
                alunoId={selectedStudent.id}
                currentUserId={user.id}
                themeColor={personalSettings?.theme_color}
              />
            </div>
          ) : (
            <div className="flex h-full min-h-[620px] flex-col items-center justify-center p-8 text-center text-muted-foreground">
              <MessageSquare className="mb-3 h-12 w-12 opacity-30" />
              <p className="text-sm font-medium text-foreground">Selecione uma conversa</p>
              <p className="mt-1 text-xs">Escolha um aluno para abrir o chat.</p>
            </div>
          )}
        </section>
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <AppLayout>
        <div className="flex min-h-screen flex-col bg-background">
          <MobileHeaderPersonal
            personalId={user?.id}
            personalSettings={personalSettings}
            profileName={profile?.nome}
            userId={user?.id}
          />
          <main className="flex-1 overflow-auto pb-20">{content}</main>
          <BottomNavigationPersonal themeColor={personalSettings?.theme_color} />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <SidebarProvider>
        <div className="flex min-h-screen w-full bg-background">
          <AppSidebarPersonal />
          <div className="flex min-w-0 flex-1 flex-col">
            <header
              className="sticky top-0 z-10 border-b backdrop-blur-sm"
              style={{
                backgroundColor: personalSettings?.theme_color
                  ? `${personalSettings.theme_color}10`
                  : "hsl(var(--card) / 0.5)",
                borderColor: personalSettings?.theme_color
                  ? `${personalSettings.theme_color}30`
                  : "hsl(var(--border))",
              }}
            >
              <div className="flex items-center justify-between px-4 header-safe-top pb-4">
                <div className="flex items-center gap-3">
                  <SidebarTrigger />
                  <div>
                    <h1
                      className="text-xl font-bold"
                      style={{ color: personalSettings?.theme_color || "inherit" }}
                    >
                      Mensagens
                    </h1>
                    <p className="text-sm text-muted-foreground">{profile?.nome}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {user?.id && <NotificacoesDropdown userId={user.id} />}
                  {user?.id && <PersonalSettingsDialog personalId={user.id} />}
                  <ThemeToggle />
                  <Button variant="outline" onClick={signOut}>
                    Sair
                  </Button>
                </div>
              </div>
            </header>
            <main className="flex-1 overflow-auto">{content}</main>
          </div>
        </div>
      </SidebarProvider>
    </AppLayout>
  );
}

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}
