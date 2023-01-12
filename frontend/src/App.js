import "./App.css";
import { Route } from "react-router-dom";
import Homepage from "./Pages/HomePage";
import ChatPage from "./Pages/ChatPage";
// import { createBrowserHistory } from "history";

function App() {
  // const history = createBrowserHistory();
  return (
    <div className="App">
      <Route path={"/"} component={Homepage} exact />
      <Route path={"/chats"} component={ChatPage} />
    </div>
  );
}

export default App;
