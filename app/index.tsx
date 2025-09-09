import React from "react";
import { Button, Keyboard, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { FlatList, GestureHandlerRootView } from "react-native-gesture-handler";

import * as crypto from "expo-crypto";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";

type uuid = string;

type TodoItem = { id: uuid; value: string; done: boolean };
type FilterType = "all" | "pending" | "completed";

function ListItem({ todoItem, toggleTodo }: { todoItem: TodoItem; toggleTodo: (id: uuid) => void }) {

  const handlePress = (id: uuid) => {
    console.log(`Todo item with id ${id} marked as complete.`);
    toggleTodo(id);
  };

  return (
    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
      {!todoItem.done ? (
        <>
          <Text style={styles.item}>{todoItem.value}</Text>
          <Button title="Concluir" onPress={() => {handlePress(todoItem.id)}} color="green" />
        </>
      ) : (
        <Text style={styles.itemdone}>{todoItem.value}</Text>
      )}
    </View>
  );
}

function AddTodoForm({ addTodoHandler }: { addTodoHandler: (text: string) => void }) {
  const [text, setText] = React.useState("");

  const handlePress = () => {
    if(text.trim().length === 0) return;
    
    addTodoHandler(text);
    setText("");
    Keyboard.dismiss();
  };

  return (
    <View style={{ width: "100%", marginTop: 10, paddingHorizontal: 20, alignItems: "center" }}>
      <TextInput
        value={text}
        onChangeText={setText}
        style={styles.textInput}
        placeholder="O que você precisa fazer?"
        placeholderTextColor="#000"
        onSubmitEditing={handlePress}
        returnKeyType="done"
      />
    </View>
  );
}

function FilterButtons({ currentFilter, setFilter }: { currentFilter: FilterType; setFilter: (filter: FilterType) => void }) {
  return (
    <View style={styles.filterContainer}>
      <TouchableOpacity 
        style={[styles.filterButton, currentFilter === "all" && styles.activeFilter]}
        onPress={() => setFilter("all")}
      >
        <Text style={[styles.filterText, currentFilter === "all" && styles.activeFilterText]}>Todos</Text>
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={[styles.filterButton, currentFilter === "pending" && styles.activeFilter]}
        onPress={() => setFilter("pending")}
      >
        <Text style={[styles.filterText, currentFilter === "pending" && styles.activeFilterText]}>Pendentes</Text>
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={[styles.filterButton, currentFilter === "completed" && styles.activeFilter]}
        onPress={() => setFilter("completed")}
      >
        <Text style={[styles.filterText, currentFilter === "completed" && styles.activeFilterText]}>Concluídos</Text>
      </TouchableOpacity>
    </View>
  );
}

export default function Index() {
  
  const [todos, setTodos] = React.useState<TodoItem[]>([
    { id: crypto.randomUUID(), value: "Sample Todo", done: false },
    { id: crypto.randomUUID(), value: "Sample Todo 2", done: true },
    { id: crypto.randomUUID(), value: "Sample Todo 3", done: false },
  ]);

  const [currentFilter, setCurrentFilter] = React.useState<FilterType>("all");

  const addTodo = (text: string) => {
    setTodos([...todos, { id: crypto.randomUUID(), value: text, done: false }]);
  };

  const toggleTodo = (id: uuid) => {
    setTodos(todos.map(todo => todo.id === id ? { ...todo, done: !todo.done } : todo));
  };

  const getFilteredTodos = () => {
    switch (currentFilter) {
      case "pending":
        return todos.filter(todo => !todo.done);
      case "completed":
        return todos.filter(todo => todo.done);
      default:
        return todos;
    }
  };

  const filteredTodos = getFilteredTodos();

  return (
    <SafeAreaProvider>
      <SafeAreaView style={{ flex: 1, backgroundColor: "white" }}>
        <GestureHandlerRootView style={styles.container}>
          <Text style={{ fontSize: 32, fontWeight: "bold", marginTop: 20 }}>
            TODO List
          </Text>
          <AddTodoForm addTodoHandler={addTodo} />
          
          <FilterButtons currentFilter={currentFilter} setFilter={setCurrentFilter} />
          
          <Text style={styles.counterText}>
            {filteredTodos.length} item(s) {currentFilter !== "all" ? `(${currentFilter === "pending" ? "pendentes" : "concluídos"})` : ""}
          </Text>
          
          <FlatList
            style={styles.list}
            data={filteredTodos.sort((a, b) => a.done === b.done ? 0 : a.done ? 1 : -1)}
            renderItem={({ item }) => <ListItem todoItem={item} toggleTodo={toggleTodo} />}
            keyExtractor={item => item.id}
          />
        </GestureHandlerRootView>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignContent: "center",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "white",
  },
  textInput: {
    width: "100%",
    borderColor: "black",
    borderWidth: 1,
    margin: 10,
    padding: 10,
    borderRadius: 50,
  },
  item: {
    padding: 10,
    fontSize: 18,
    height: 44,
  },
  itemdone: {
    padding: 10,
    fontSize: 18,
    height: 44,
    textDecorationLine: "line-through",
  },
  list: {
    width: "100%",
    backgroundColor: "white",
    padding: 10,
    marginTop: 10,
  },
  filterContainer: {
    flexDirection: "row",
    justifyContent: "center",
    marginVertical: 15,
    paddingHorizontal: 10,
  },
  filterButton: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    marginHorizontal: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#4CAF50", 
    backgroundColor: "white",
  },
  activeFilter: {
    backgroundColor: "#4CAF50", 
  },
  filterText: {
    color: "#4CAF50", 
    fontSize: 14,
    fontWeight: "500",
  },
  activeFilterText: {
    color: "white", 
    fontWeight: "600",
  },
  counterText: {
    fontSize: 14,
    color: "#666",
    marginBottom: 10,
    textAlign: "center",
  },
});