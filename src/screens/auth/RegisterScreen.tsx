import React, { useState } from "react";
import { View } from "react-native";
import { TextInput, Button, Text } from "react-native-paper";
//import { registerUser } from '../../services/authService';
import { useNavigation } from "@react-navigation/native";
import { registerUser } from "../../services/authService";
import AlertDialog from "../../components/AlertDialog";
//import AlertDialog from '../../components/AlertDialog';

export default function RegisterScreen() {
  const [login, setLogin] = useState("");
  const [nome, setNome] = useState("");
  const [senha, setSenha] = useState("");
  const [loading, setLoading] = useState(false);

  const [dialogVisible, setDialogVisible] = useState(false);
  const [dialogMsg, setDialogMsg] = useState("");
  const [dialogType, setDialogType] = useState<"success" | "error" | "warning">(
    "success"
  );

  const navigation = useNavigation<any>();

  const handleRegister = async () => {
    if (!login || !nome || !senha) {
      setDialogMsg("Preencha todos os campos.");
      setDialogType("warning");
      setDialogVisible(true);
      return;
    }

    try {
      setLoading(true);
      await registerUser({ login, nome, senha });
      setDialogMsg("Conta criada com sucesso!");
      setDialogType("success");
      setDialogVisible(true);
      setTimeout(() => navigation.navigate("Login"), 1200);
    } catch (error) {
      setDialogMsg("Erro ao registrar. Tente novamente.");
      setDialogType("error");
      setDialogVisible(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ padding: 20 }}>
      <Text variant="titleLarge" style={{ marginBottom: 16 }}>
        Criar Conta
      </Text>

      <TextInput
        label="Login"
        value={login}
        onChangeText={setLogin}
        mode="outlined"
        style={{ marginBottom: 10 }}
      />
      <TextInput
        label="Nome"
        value={nome}
        onChangeText={setNome}
        mode="outlined"
        style={{ marginBottom: 10 }}
      />
      <TextInput
        label="Senha"
        value={senha}
        onChangeText={setSenha}
        secureTextEntry
        mode="outlined"
        style={{ marginBottom: 16 }}
      />

      <Button mode="contained" loading={loading} onPress={handleRegister}>
        Registrar
      </Button>
      <Button
        onPress={() => navigation.navigate("Login")}
        style={{ marginTop: 10 }}
      >
        Já tem conta? Entrar
      </Button>

      <AlertDialog
        visible={dialogVisible}
        onDismiss={() => setDialogVisible(false)}
        message={dialogMsg}
        type={dialogType}
      />
    </View>
  );
}
