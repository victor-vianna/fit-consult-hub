// src/components/admin/sections/UsuariosManager.tsx
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Search,
  UserPlus,
  Mail,
  Calendar,
  Shield,
  MoreVertical,
  Ban,
  CheckCircle,
  Trash2,
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

  useEffect(() => {
    fetchUsuarios();
  }, []);

  const fetchUsuarios = async () => {
    try {
      setLoading(true);

      // Buscar profiles
      const { data: profilesData, error: profilesError } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });

      if (profilesError) throw profilesError;

      // Buscar roles
      const { data: rolesData, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id, role");

      if (rolesError) throw rolesError;

      // Mapear usuários com suas roles
      const usuariosComRoles: Usuario[] =
        profilesData?.map((profile) => ({
          id: profile.id,
          nome: profile.nome || "Sem nome",
          email: profile.email || "Sem email",
          created_at: profile.created_at,
          roles:
            rolesData
              ?.filter((r) => r.user_id === profile.id)
              .map((r) => r.role) || [],
          ativo: true, // Você pode adicionar um campo na tabela profiles
        })) || [];

      setUsuarios(usuariosComRoles);
    } catch (error: any) {
      console.error("Erro ao carregar usuários:", error);
      toast({
        title: "Erro ao carregar usuários",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredUsuarios = usuarios.filter((usuario) => {
    const matchesSearch =
      usuario.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      usuario.email.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesRole =
      selectedRole === "todos" || usuario.roles.includes(selectedRole);

    return matchesSearch && matchesRole;
  });

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "admin":
        return "bg-purple-100 text-purple-800 border-purple-200";
      case "personal":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "aluno":
        return "bg-green-100 text-green-800 border-green-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const handleToggleStatus = async (userId: string, currentStatus: boolean) => {
    try {
      // Implementar lógica de ativar/desativar usuário
      toast({
        title: currentStatus ? "Usuário desativado" : "Usuário ativado",
        description: "Status alterado com sucesso",
      });
      fetchUsuarios();
    } catch (error: any) {
      toast({
        title: "Erro ao alterar status",
        description: error.message,
        variant: "destructive",
      });
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
      {/* Header com estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{usuarios.length}</div>
            <p className="text-xs text-muted-foreground">Total de Usuários</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-blue-600">
              {usuarios.filter((u) => u.roles.includes("personal")).length}
            </div>
            <p className="text-xs text-muted-foreground">Personals</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-green-600">
              {usuarios.filter((u) => u.roles.includes("aluno")).length}
            </div>
            <p className="text-xs text-muted-foreground">Alunos</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-purple-600">
              {usuarios.filter((u) => u.roles.includes("admin")).length}
            </div>
            <p className="text-xs text-muted-foreground">Administradores</p>
          </CardContent>
        </Card>
      </div>

      {/* Filtros e busca */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Gerenciamento de Usuários</span>
            <Button>
              <UserPlus className="mr-2 h-4 w-4" />
              Novo Usuário
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome ou email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              {["todos", "admin", "personal", "aluno"].map((role) => (
                <Button
                  key={role}
                  variant={selectedRole === role ? "default" : "outline"}
                  onClick={() => setSelectedRole(role)}
                  size="sm"
                >
                  {role.charAt(0).toUpperCase() + role.slice(1)}
                </Button>
              ))}
            </div>
          </div>

          {/* Lista de usuários */}
          <div className="space-y-3">
            {filteredUsuarios.map((usuario) => (
              <div
                key={usuario.id}
                className="p-4 border-2 rounded-lg hover:shadow-md transition-all"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="font-semibold">{usuario.nome}</h4>
                      {usuario.ativo ? (
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      ) : (
                        <Ban className="h-4 w-4 text-red-600" />
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                      <Mail className="h-4 w-4" />
                      <span>{usuario.email}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
                      <Calendar className="h-3 w-3" />
                      <span>
                        Cadastrado em{" "}
                        {format(new Date(usuario.created_at), "dd/MM/yyyy")}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      {usuario.roles.map((role) => (
                        <Badge key={role} className={getRoleBadgeColor(role)}>
                          <Shield className="h-3 w-3 mr-1" />
                          {role.toUpperCase()}
                        </Badge>
                      ))}
                      {usuario.roles.length === 0 && (
                        <Badge variant="outline">Sem role</Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() =>
                        handleToggleStatus(usuario.id, usuario.ativo)
                      }
                    >
                      {usuario.ativo ? (
                        <Ban className="h-4 w-4" />
                      ) : (
                        <CheckCircle className="h-4 w-4" />
                      )}
                    </Button>
                    <Button variant="outline" size="icon">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}

            {filteredUsuarios.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <p>Nenhum usuário encontrado</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
