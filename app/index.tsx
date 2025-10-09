import React, { useEffect, useState } from "react";
import { Animated, Button, Keyboard, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { FlatList, GestureHandlerRootView, RectButton, Swipeable } from "react-native-gesture-handler";

import { SQLiteProvider, useSQLiteContext } from "expo-sqlite";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { addTodoToDB, getAllTodos, getDBVersion, getSQLiteVersion, migrateDB, toggleTodoStatus } from "./db";
import { TodoItem, uuid } from "./types";


function ListItem({ todoItem, toggleTodo }: { todoItem: TodoItem; toggleTodo: (id: uuid) => void }) {
  const swipeableRef = React.useRef<Swipeable>(null);

  const handleSwipe = (id: uuid) => {
    console.log(`Todo item with id ${id} status toggled via swipe.`);
    toggleTodo(id);
    setTimeout(() => {
      swipeableRef.current?.close();
    }, 300);
  };

  const renderRightActions = (progress: Animated.AnimatedInterpolation<number>, dragX: Animated.AnimatedInterpolation<number>) => {
    return (
      <View style={swipeStyles.rightActions}>
        <RectButton
          style={[swipeStyles.actionButton, todoItem.done ? swipeStyles.reopenAction : swipeStyles.completeAction]}
          onPress={() => handleSwipe(todoItem.id)}
        >
          <Text style={swipeStyles.actionText}>
            {todoItem.done ? 'Reabrir' : 'Concluir'}
          </Text>
        </RectButton>
      </View>
    );
  };

  const renderLeftActions = (progress: Animated.AnimatedInterpolation<number>, dragX: Animated.AnimatedInterpolation<number>) => {
    return (
      <View style={swipeStyles.leftActions}>
        <RectButton
          style={[swipeStyles.actionButton, todoItem.done ? swipeStyles.reopenAction : swipeStyles.completeAction]}
          onPress={() => handleSwipe(todoItem.id)}
        >
          <Text style={swipeStyles.actionText}>
            {todoItem.done ? 'Reabrir' : 'Concluir'}
          </Text>
        </RectButton>
      </View>
    );
  };

  return (
    <Swipeable
      ref={swipeableRef}
      renderRightActions={renderRightActions}
      renderLeftActions={renderLeftActions}
      onSwipeableRightOpen={() => handleSwipe(todoItem.id)}
      onSwipeableLeftOpen={() => handleSwipe(todoItem.id)}
      friction={2}
      leftThreshold={30}
      rightThreshold={40}
      containerStyle={swipeStyles.swipeContainer}
    >
      <View style={[styles.listItemContainer, todoItem.done && styles.completedItem]}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", flex: 1 }}>
          {!todoItem.done ? (
            <>
              <Text style={styles.item}>{todoItem.text}</Text>
              <Button title="Concluir" onPress={() => { handleSwipe(todoItem.id) }} color="green" />
            </>
          ) : (
            <>
              <Text style={styles.itemdone}>{todoItem.text}</Text>
              <Button title="Reabrir" onPress={() => { handleSwipe(todoItem.id) }} color="orange" />
            </>
          )}
        </View>
      </View>
    </Swipeable>
  );
}

enum FilterOptions {
  All = "all",
  Pending = "pending",
  Done = "done"
}

function TodosFilter({ selectedValue, setFilter }: { selectedValue: FilterOptions, setFilter: (value: FilterOptions) => void }) {
  return (
    <View style={filterStyles.filterMenu}>
      <TouchableOpacity
        style={[filterStyles.button, filterStyles.buttonAll, selectedValue === FilterOptions.All && filterStyles.buttonAllSelected]}
        onPress={() => setFilter(FilterOptions.All)}
      >
        <Text style={[filterStyles.label, filterStyles.buttonAllLabel, selectedValue === FilterOptions.All && filterStyles.buttonAllSelectedLabel]}>Todos</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[filterStyles.button, filterStyles.buttonPending, selectedValue === FilterOptions.Pending && filterStyles.buttonPendingSelected]}
        onPress={() => setFilter(FilterOptions.Pending)}
      >
        <Text style={[filterStyles.label, filterStyles.buttonPendingLabel, selectedValue === FilterOptions.Pending && filterStyles.buttonPendingSelectedLabel]}>Pendentes</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[filterStyles.button, filterStyles.buttonDone, selectedValue === FilterOptions.Done && filterStyles.buttonDoneSelected]}
        onPress={() => setFilter(FilterOptions.Done)}
      >
        <Text style={[filterStyles.label, filterStyles.buttonDoneLabel, selectedValue === FilterOptions.Done && filterStyles.buttonDoneSelectedLabel]}>Concluídos</Text>
      </TouchableOpacity>
    </View>
  );
}

function AddTodoForm({ addTodoHandler }: { addTodoHandler: (text: string) => void }) {
  const [text, setText] = React.useState("");

  const handlePress = () => {
    if (text.trim().length === 0) return;

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

function Footer() {
  const db = useSQLiteContext();

  const [sqliteVersion, setSqliteVersion] = useState<string>("");
  const [dbVersion, setDBVersion] = useState<string>();

  useEffect( () => {
    async function setup(){
      try {
        const sqliteVersionResult = await getSQLiteVersion(db);
        if (sqliteVersionResult) {
          setSqliteVersion(sqliteVersionResult['sqlite_version()']);
        }
        else {
          setSqliteVersion('unknown');
        }

        const dbVersionResult = await getDBVersion(db);
        
        if (dbVersionResult) {
          setDBVersion(dbVersionResult['user_version'].toString());
        }
        else {
          setDBVersion('unknown');
        }
      } catch (error) {
        console.log('Error getting database info:', error);
        setSqliteVersion('error');
        setDBVersion('error');
      }
    }

    setup();
  }, [db]);

  return (
    <View>
      <Text style={{padding: 20}}>SQLite version: {sqliteVersion} / DBVersion: {dbVersion}</Text>
    </View>
  );
}

function TodoList() {
  
  const [todos, setTodos] = React.useState<TodoItem[]>([]);
  const [dbError, setDbError] = React.useState<string | null>(null);

  const db = useSQLiteContext();
  
  useEffect(() => {
    async function load() {
      try {
        const result = await getAllTodos(db);
        setTodos(result);
        setDbError(null);
      } catch (error) {
        console.error('Error loading todos:', error);
        setDbError('Erro ao carregar tarefas');
        setTodos([
          { id: '1', text: 'Exemplo de tarefa 1', done: false, createdAt: new Date() },
          { id: '2', text: 'Exemplo de tarefa concluída', done: true, createdAt: new Date() },
        ]);
      }
    }
    
    load();
  }, [db])

  const [filter, setFilter] = React.useState<FilterOptions>(FilterOptions.All);

  const addTodo = async (text: string) => {
    try {
      await addTodoToDB(db, text);
      const result = await getAllTodos(db);
      setTodos(result);
      setDbError(null);
    } catch (error) {
      console.error('Error adding todo:', error);
      setDbError('Erro ao adicionar tarefa');
      // Fallback: adiciona localmente sem o banco
      const newTodo: TodoItem = {
        id: Date.now().toString(),
        text,
        done: false,
        createdAt: new Date()
      };
      setTodos(prev => [...prev, newTodo]);
    }
  };

  const toggleTodo = async (id: uuid) => {
    try {
      await toggleTodoStatus(db, id);
      const result = await getAllTodos(db);
      setTodos(result);
      setDbError(null);
    } catch (error) {
      console.error('Error toggling todo:', error);
      setDbError('Erro ao atualizar tarefa');
      setTodos(prev => prev.map(todo => 
        todo.id === id ? { ...todo, done: !todo.done } : todo
      ));
    }
  };

  const filteredTodos = todos.filter(todo => {
    switch (filter) {
      case FilterOptions.All:
        return true;
      case FilterOptions.Pending:
        return !todo.done;
      case FilterOptions.Done:
        return todo.done;
      default:
        return true;
    }
  }).sort((a, b) => {
    const aDate = a.createdAt ?? new Date(0);
    const bDate = b.createdAt ?? new Date(0);
    return aDate === bDate ? 0 : aDate < bDate ? 1 : -1;
  });

  return (
    <GestureHandlerRootView style={styles.container}>
      <Text style={{ fontSize: 32, fontWeight: "bold", marginTop: 20 }}>
        TODO List
      </Text>
      
      {dbError && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{dbError}</Text>
        </View>
      )}
      
      <AddTodoForm addTodoHandler={addTodo} />
      <TodosFilter selectedValue={filter} setFilter={setFilter} />
      
      {filteredTodos.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateText}>
            {filter === FilterOptions.All 
              ? "Nenhuma tarefa encontrada" 
              : filter === FilterOptions.Pending 
                ? "Nenhuma tarefa pendente" 
                : "Nenhuma tarefa concluída"}
          </Text>
        </View>
      ) : (
        <FlatList
          style={styles.list}
          data={filteredTodos}
          renderItem={({ item }) => (
            <ListItem todoItem={item} toggleTodo={toggleTodo} />
          )}
          keyExtractor={(item) => item.id}
        />
      )}
    </GestureHandlerRootView>
  );
}

export default function Index() {
  return (
    <SafeAreaProvider>
      <SafeAreaView style={{ flex: 1, backgroundColor: "white" }}>
        <SQLiteProvider 
          databaseName="todos.db" 
          onInit={migrateDB}
          options={{
            enableChangeListener: true,
          }}
        >
          <TodoList />
          <Footer />
        </SQLiteProvider>
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
    flex: 1,
  },
  itemdone: {
    padding: 10,
    fontSize: 18,
    height: 44,
    textDecorationLine: "line-through",
    flex: 1,
  },
  list: {
    width: "100%",
    backgroundColor: "white",
    padding: 10,
    marginTop: 20,
  },
  listItemContainer: {
    backgroundColor: "white",
    marginVertical: 4,
    borderRadius: 8,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  completedItem: {
    backgroundColor: "#f8f9fa",
  },
  errorContainer: {
    backgroundColor: '#ffebee',
    padding: 10,
    margin: 10,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#f44336',
  },
  errorText: {
    color: '#d32f2f',
    textAlign: 'center',
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
});

const filterStyles = StyleSheet.create({
  filterMenu: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    paddingHorizontal: 20,
    marginTop: 10
  },

  button: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 50,
    alignSelf: 'flex-start',
    marginHorizontal: '1%',
    marginBottom: 6,
    minWidth: '28%',
    textAlign: 'center',
  },

  label: {
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },

  buttonAll: {
    backgroundColor: 'lightgreen',
  },
  buttonAllSelected: {
    backgroundColor: 'darkgreen',
  },

  buttonAllLabel: {
    color: 'darkgreen',
  },

  buttonAllSelectedLabel: {
    color: 'lightgreen',
  },

  buttonPending: {
    backgroundColor: 'oldlace',
  },
  buttonPendingSelected: {
    backgroundColor: 'coral',
  },

  buttonPendingLabel: {
    color: 'coral',
  },
  buttonPendingSelectedLabel: {
    color: 'oldlace',
  },

  buttonDone: {
    backgroundColor: 'lightblue',
  },
  buttonDoneSelected: {
    backgroundColor: 'royalblue',
  },
  buttonDoneLabel: {
    color: 'royalblue',
  },
  buttonDoneSelectedLabel: {
    color: 'lightblue',
  },

  selectedLabel: {
    color: 'white',
  },
});

const swipeStyles = StyleSheet.create({
  swipeContainer: {
    marginVertical: 4,
  },
  rightActions: {
    flexDirection: 'row',
    width: 120,
    marginVertical: 4,
    borderRadius: 8,
    overflow: 'hidden',
  },
  leftActions: {
    width: 120,
    marginVertical: 4,
    borderRadius: 8,
    overflow: 'hidden',
  },
  actionButton: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  completeAction: {
    backgroundColor: '#28a745',
  },
  reopenAction: {
    backgroundColor: '#ff9800',
  },
  actionText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
});