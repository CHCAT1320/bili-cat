import { useEffect } from "react";
import { Route, Routes } from "react-router";
import { refreshAccount } from "./bilibili/account";
import Bangumi from "./pages/Bangumi";
import BangumiSeason from "./pages/BangumiSeason";
import Dynamic from "./pages/Dynamic";
import Home from "./pages/Home";
import Main from "./pages/Main";
import Message from "./pages/Message";
import Mine from "./pages/Mine";
import Rank from "./pages/Rank";
import Search from "./pages/Search";
import Space from "./pages/Space";
import Video from "./pages/Video";
import "./App.css";

function App() {
  useEffect(() => {
    void refreshAccount();
  }, []);

  return (
    <main className="container">
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/main" element={<Main />} />
        <Route path="/rank" element={<Rank />} />
        <Route path="/dynamic" element={<Dynamic />} />
        <Route path="/message" element={<Message />} />
        <Route path="/bangumi" element={<Bangumi />} />
        <Route path="/bangumi/:seasonId" element={<BangumiSeason />} />
        <Route path="/mine" element={<Mine />} />
        <Route path="/search" element={<Search />} />
        <Route path="/video/:id" element={<Video />} />
        <Route path="/space/:mid" element={<Space />} />
      </Routes>
    </main>
  );
}

export default App;
