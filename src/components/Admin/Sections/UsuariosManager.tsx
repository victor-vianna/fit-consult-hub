import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Search, UserPlus, Mail, Calendar, Shield, Ban, CheckCircle, MoreVertical,
} from "lucide-react";
import { format } from "date-fns";

interface Usuario {
  id: string;
  nome: string;
  email: string;
  created_at: string;
  roles: string[];
  ativo: boolean;
}

export default function UsuariosManager() {
  const { toast } = useToast();
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRole, setSelectedRole] = useState<string>("todos");

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [novoTipo, setNovoTipo] = useState<"aluno" | "personal">("aluno");
  const [novoNome, setNovoNome] = useState("");
  const [novoEmail, setNovoEmail] = useState("");
  const [novoTelefone, setNovoTelefone] = useState("");
  const [novoSenha, setNovoSenha] = useState("");
  const [novoPersonalId, setNovoPersonalId] = useState("");
  const [personals, setPersonals] = useState<{ id: string; nome: string }[]>([]);

  useEffect(() => {
    fetchUsuarios();
    fetchPersonals();
  }, []);

  const fetchPersonals = async () => {
    const { data: roles } = await supabase
      .from("user_roles")
      .select("user_id")
      .eq("role", "personal");

    if (!roles?.length) return;

    const ids = roles.map((r) => r.user_id);
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, nome")
      .in("id", ids);

    if (profiles) setPersonals(profiles);
  };

  const fetchUsuarios = async () => {
    try {
      setLoading(true);
      const { data: profilesData, error: profilesError } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });

      if (profilesError) throw profilesError;

      const { data: rolesData, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id, role");

      if (rolesError) throw rolesError;

      const usuariosComRoles: Usuario[] =
        profilesData?.map((profile) => ({
          id: profile.id,
          nome: profile.nome || "Sem nome",
          email: profile.email || "Sem email",
          created_at: profile.created_at,
          roles: rolesData?.filter((r) => r.user_id === profile.id).map((r) => r.role) || [],
          ativo: profile.is_active ?? true,
        })) || [];

      setUsuarios(usuariosComRoles);
    } catch (error: any) {
      toast({ title: "Erro ao carregar usuários", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleCriarUsuario = async (e: React.FormEvent) => {
    e.preventDefault();
    if (novoSenha.length < 6) {
      toast({ title: "Senha muito curta", description: "Mínimo 6 caracteres", variant: "destructive" });
      return;
    }

    setCreating(true);
    try {
      if (novoTipo === "personal") {
        const { data, error } = await supabase.functions.invoke("create-personal-user", {
          body: { email: novoEmail, password: novoSenha, nome: novoNome, telefone: novoTelefone },
        });
        if (error) throw error;
        if (data?.error) throw new Error(data.error);
      } else {
        const { data, error } = await supabase.functions.invoke("create-aluno-user", {
          body: {
            email: novoEmail,
            password: novoSenha,
            nome: novoNome,
            telefone: novoTelefone,
            personal_id: novoPersonalId || null,
          },
        });
        if (error) throw error;
        if (data?.error) throw new Error(data.error);
      }

      toast({ title: "Usuário criado!", description: `${novoNome} foi cadastrado como ${novoTipo}.` });
      setDialogOpen(false);
      resetForm();
      fetchUsuarios();
    } catch (error: any) {
      toast({ title: "Erro ao criar usuário", description: error.message, variant: "destructive" });
    } finally {
      setCreating(false);
    }
  };

  const resetForm = () => {
    setNovoTipo("aluno");
    setNovoNome("");
    setNovoEmail("");
    setNovoTelefone("");
    setNovoSenha("");
    setNovoPersonalId("");
  };

  const filteredUsuarios = usuarios.filter((usuario) => {
    const matchesSearch =
      usuario.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      usuario.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = selectedRole === "todos" || usuario.roles.includes(selectedRole);
    return matchesSearch && matchesRole;
  });

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "admin": return "bg-purple-100 text-purple-800 border-purple-200";
      case "personal": return "bg-blue-100 text-blue-800 border-blue-200";
      case "aluno": return "bg-green-100 text-green-800 border-green-200";
      default: return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const handleToggleStatus = async (userId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ is_active: !currentStatus })
        .eq("id", userId);

      if (error) throw error;

      toast({ title: currentStatus ? "Usuário desativado" : "Usuário ativado" });
      fetchUsuarios();
    } catch (error: any) {
      toast({ title: "Erro ao alterar status", description: error.message, variant: "destructive" });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent mx-auto mb-4" />
          <p className="text-muted-foreground">Carregando usuários...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card><CardContent className="pt-6"><div className="text-2xl font-bold">{usuarios.length}</div><p className="text-xs text-muted-foreground">Total de Usuários</p></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="text-2xl font-bold text-blue-600">{usuarios.filter((u) => u.roles.includes("personal")).length}</div><p className="text-xs text-muted-foreground">Personals</p></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="text-2xl font-bold text-green-600">{usuarios.filter((u) => u.roles.includes("aluno")).length}</div><p className="text-xs text-muted-foreground">Alunos</p></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="text-2xl font-bold text-purple-600">{usuarios.filter((u) => u.roles.includes("admin")).length}</div><p className="text-xs text-muted-foreground">Administradores</p></CardContent></Card>
      </div>

      {/* Filters + User list */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Gerenciamento de Usuários</span>
            <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
              <DialogTrigger asChild>
                <Button><UserPlus className="mr-2 h-4 w-4" />Novo Usuário</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Criar Novo Usuário</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleCriarUsuario} className="space-y-4">
                  <div className="flex items-center justify-between rounded-lg border p-3">
                    <div>
                      <p className="text-sm font-medium">Tipo</p>
                      <p className="text-xs text-muted-foreground">
                        {novoTipo === "aluno" ? "Criando aluno" : "Criando personal"}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs">Aluno</span>
                      <Switch checked={novoTipo === "personal"} onCheckedChange={(c) => setNovoTipo(c ? "personal" : "aluno")} />
                      <span className="text-xs">Personal</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Nome</Label>
                    <Input value={novoNome} onChange={(e) => setNovoNome(e.target.value)} placeholder="Nome completo" required />
                  </div>
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input type="email" value={novoEmail} onChange={(e) => setNovoEmail(e.target.value)} placeholder="email@exemplo.com" required />
                  </div>
                  <div className="space-y-2">
                    <Label>Telefone (opcional)</Label>
                    <Input value={novoTelefone} onChange={(e) => setNovoTelefone(e.target.value)} placeholder="(00) 00000-0000" />
                  </div>
                  <div className="space-y-2">
                    <Label>Senha</Label>
                    <Input type="password" value={novoSenha} onChange={(e) => setNovoSenha(e.target.value)} placeholder="Mínimo 6 caracteres" required />
                  </div>

                  {novoTipo === "aluno" && (
                    <div className="space-y-2">
                      <Label>Vincular a Personal (opcional)</Label>
                      <Select value={novoPersonalId} onValueChange={setNovoPersonalId}>
                        <SelectTrigger><SelectValue placeholder="Selecione um personal" /></SelectTrigger>
                        <SelectContent>
                          {personals.map((p) => (
                            <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  <Button type="submit" className="w-full" disabled={creating}>
                    {creating ? "Criando..." : `Criar ${novoTipo === "personal" ? "Personal" : "Aluno"}`}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Buscar por nome ou email..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" />
            </div>
            <div className="flex gap-2">
              {["todos", "admin", "personal", "aluno"].map((role) => (
                <Button key={role} variant={selectedRole === role ? "default" : "outline"} onClick={() => setSelectedRole(role)} size="sm">
                  {role.charAt(0).toUpperCase() + role.slice(1)}
                </Button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            {filteredUsuarios.map((usuario) => (
              <div key={usuario.id} className="p-4 border-2 rounded-lg hover:shadow-md transition-all">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="font-semibold">{usuario.nome}</h4>
                      {usuario.ativo ? <CheckCircle className="h-4 w-4 text-green-600" /> : <Ban className="h-4 w-4 text-red-600" />}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                      <Mail className="h-4 w-4" /><span>{usuario.email}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
                      <Calendar className="h-3 w-3" />
                      <span>Cadastrado em {format(new Date(usuario.created_at), "dd/MM/yyyy")}</span>
                    </div>
                    <div className="flex gap-2">
                      {usuario.roles.map((role) => (
                        <Badge key={role} className={getRoleBadgeColor(role)}>
                          <Shield className="h-3 w-3 mr-1" />{role.toUpperCase()}
                        </Badge>
                      ))}
                      {usuario.roles.length === 0 && <Badge variant="outline">Sem role</Badge>}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="icon" onClick={() => handleToggleStatus(usuario.id, usuario.ativo)}>
                      {usuario.ativo ? <Ban className="h-4 w-4" /> : <CheckCircle className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
              </div>
            ))}
            {filteredUsuarios.length === 0 && (
              <div className="text-center py-12 text-muted-foreground"><p>Nenhum usuário encontrado</p></div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
