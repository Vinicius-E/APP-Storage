import React, { useState } from "react";
import { View } from "react-native";
import { TextInput, Button, Text } from "react-native-paper";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation } from "@react-navigation/native";
import AlertDialog from "../../components/AlertDialog";
import { loginUsuario } from "../../services/authService";

export default function LoginScreen() {
  const [login, setLogin] = useState("");
  const [senha, setSenha] = useState("");
  const [dialogVisible, setDialogVisible] = useState(false);
  const [dialogMsg, setDialogMsg] = useState("");
  const [dialogType, setDialogType] = useState<"success" | "error" | "warning">(
    "success"
  );

  const navigation = useNavigation<any>();

  const handleLogin = async () => {
    try {
      const usuario = await loginUsuario(login, senha);

      if (!usuario || !usuario.token) {
        throw new Error("Usuário inválido");
      }

      await AsyncStorage.setItem("authToken", usuario.token);
      setDialogMsg(`Bem-vindo, ${usuario.nome}`);
      setDialogType("success");
      setDialogVisible(true);

      setTimeout(() => navigation.navigate("Warehouse"), 1000);
    } catch (error) {
      setDialogMsg("Login inválido ou erro de conexão");
      setDialogType("error");
      setDialogVisible(true);
    }
  };

  return (
    <View style={{ padding: 20 }}>
      <TextInput
        label="Login"
        value={login}
        onChangeText={setLogin}
        mode="outlined"
        style={{ marginBottom: 10 }}
      />
      <TextInput
        label="Senha"
        value={senha}
        onChangeText={setSenha}
        mode="outlined"
        secureTextEntry
        style={{ marginBottom: 16 }}
      />
      <Button mode="contained" onPress={handleLogin}>
        Entrar
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
