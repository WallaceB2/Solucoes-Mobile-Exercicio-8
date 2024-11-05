import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import * as SQLite from 'expo-sqlite';
import { useState, useEffect } from "react";
import { FlatList, StyleSheet, View } from "react-native";
import {
  Appbar,
  Button,
  List,
  PaperProvider,
  Switch,
  Text,
  MD3LightTheme as DefaultTheme,
} from "react-native-paper";
import myColors from "./assets/colors.json";
import myColorsDark from "./assets/colorsDark.json";

// Inicializa o banco de dados
const db = SQLite.openDatabase("locations.db");

export default function App() {
  const [isSwitchOn, setIsSwitchOn] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [locations, setLocations] = useState([]);
  const [theme, setTheme] = useState({
    ...DefaultTheme,
    colors: myColors.colors,
  });

  // Função para carregar o tema do AsyncStorage
  async function loadDarkMode() {
    const darkMode = await AsyncStorage.getItem('darkMode');
    if (darkMode !== null) {
      setIsSwitchOn(JSON.parse(darkMode));
    }
  }

  // Evento para alternar o tema e salvar no AsyncStorage
  async function onToggleSwitch() {
    const newSwitchState = !isSwitchOn;
    setIsSwitchOn(newSwitchState);
    await AsyncStorage.setItem('darkMode', JSON.stringify(newSwitchState));
  }

  // Função para capturar a localização do usuário
  async function getLocation() {
    setIsLoading(true);
    const { status } = await Location.requestForegroundPermissionsAsync();

    if (status !== 'granted') {
      setIsLoading(false);
      alert("Permissão de localização negada.");
      return;
    }

    const location = await Location.getCurrentPositionAsync({});
    const newLocation = {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
    };

    // Insere a localização no banco de dados
    db.transaction(tx => {
      tx.executeSql(
        "INSERT INTO locations (latitude, longitude) VALUES (?, ?);",
        [newLocation.latitude, newLocation.longitude],
        (_, result) => {
          setLocations(prevLocations => [
            ...prevLocations,
            { id: result.insertId, ...newLocation },
          ]);
        },
        (error) => console.error("Erro ao inserir localização:", error)
      );
    });
    setIsLoading(false);
  }

  // Função para carregar localizações do banco de dados
  async function loadLocations() {
    setIsLoading(true);
    db.transaction(tx => {
      // Cria a tabela se não existir
      tx.executeSql(
        "CREATE TABLE IF NOT EXISTS locations (id INTEGER PRIMARY KEY AUTOINCREMENT, latitude REAL, longitude REAL);"
      );
      // Seleciona as localizações
      tx.executeSql(
        "SELECT * FROM locations;",
        [],
        (_, { rows }) => setLocations(rows._array),
        (error) => console.error("Erro ao carregar localizações:", error)
      );
    });
    setIsLoading(false);
  }

  useEffect(() => {
    loadDarkMode();
    loadLocations();
  }, []);

  useEffect(() => {
    if (isSwitchOn) {
      setTheme({ ...theme, colors: myColorsDark.colors });
    } else {
      setTheme({ ...theme, colors: myColors.colors });
    }
  }, [isSwitchOn]);

  return (
    <PaperProvider theme={theme}>
      <Appbar.Header>
        <Appbar.Content title="My Location BASE" />
      </Appbar.Header>
      <View style={{ backgroundColor: theme.colors.background }}>
        <View style={styles.containerDarkMode}>
          <Text>Dark Mode</Text>
          <Switch value={isSwitchOn} onValueChange={onToggleSwitch} />
        </View>
        <Button
          style={styles.containerButton}
          icon="map"
          mode="contained"
          loading={isLoading}
          onPress={() => getLocation()}
        >
          Capturar localização
        </Button>

        <FlatList
          style={styles.containerList}
          data={locations}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => (
            <List.Item
              title={`Localização ${item.id}`}
              description={`Latitude: ${item.latitude} | Longitude: ${item.longitude}`}
            />
          )}
        />
      </View>
    </PaperProvider>
  );
}

const styles = StyleSheet.create({
  containerDarkMode: {
    margin: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  containerButton: {
    margin: 10,
  },
  containerList: {
    margin: 10,
    height: "100%",
  },
});
