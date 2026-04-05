import { db, auth } from "./firebase";
import { useState, useEffect } from "react";
import {
  collection, addDoc, getDocs, doc, updateDoc, deleteDoc, query, where
} from "firebase/firestore";
import {
  signInWithPopup, GoogleAuthProvider, onAuthStateChanged
} from "firebase/auth";

import { PieChart, Pie, Cell, Tooltip, Legend, Label } from "recharts";

function App() {
  const [articles, setArticles] = useState([]);
  const [title, setTitle] = useState("");
  const [keyword, setKeyword] = useState("");
  const [user, setUser] = useState(null);
  const [filterStatus, setFilterStatus] = useState("ALL");

  const [editingId, setEditingId] = useState(null);
  const [editTitle, setEditTitle] = useState("");
  const [editKeyword, setEditKeyword] = useState("");

  const provider = new GoogleAuthProvider();

  const generateDummy = () => ({
    pv: Math.floor(Math.random() * 200),
    impressions: Math.floor(Math.random() * 5000),
    ctr: (Math.random() * 3).toFixed(2)
  });

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (u) fetchArticles(u);
    });
    return () => unsub();
  }, []);

  const formatUrl = (index) => `/article-${index + 1}/`;

  const fetchArticles = async (u) => {
    const q = query(collection(db, "articles"), where("userId", "==", u.uid));
    const snap = await getDocs(q);

    const base = snap.docs.map(d => ({ id: d.id, ...d.data() }));

    const merged = base.map((a, index) => ({
      ...a,
      ...generateDummy(),
      displayUrl: formatUrl(index)
    }));

    setArticles(merged);
  };

  const addArticle = async () => {
    if (!title || !user) return;

    await addDoc(collection(db, "articles"), {
      title,
      keyword,
      status: "未対策",
      userId: user.uid
    });

    setTitle("");
    setKeyword("");
    fetchArticles(user);
  };

  const changeStatus = async (id, status) => {
    await updateDoc(doc(db, "articles", id), { status });

    setArticles(prev =>
      prev.map(a => (a.id === id ? { ...a, status } : a))
    );
  };

  const deleteArticle = async (id) => {
    if (!confirm("削除する？")) return;
    await deleteDoc(doc(db, "articles", id));
    setArticles(prev => prev.filter(a => a.id !== id));
  };

  const startEdit = (a) => {
    setEditingId(a.id);
    setEditTitle(a.title);
    setEditKeyword(a.keyword);
  };

  const saveEdit = async (id) => {
    await updateDoc(doc(db, "articles", id), {
      title: editTitle,
      keyword: editKeyword
    });

    setArticles(prev =>
      prev.map(a =>
        a.id === id
          ? { ...a, title: editTitle, keyword: editKeyword }
          : a
      )
    );

    setEditingId(null);
  };

  const getSuggestion = (a) => {
    if (a.impressions > 3000 && a.ctr < 1) return "🔥 タイトル改善推奨";
    if (a.pv < 50) return "⚠️ リライト推奨";
    return "✅ 良好";
  };

  const rankedArticles = [...articles]
    .map(a => ({
      ...a,
      score:
        (a.impressions > 3000 && a.ctr < 1 ? 100 : 0) +
        (a.pv < 50 ? 50 : 0)
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);

  const filteredArticles =
    filterStatus === "ALL"
      ? articles
      : articles.filter(a => a.status === filterStatus);

  if (!user) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-100">
        <button
          onClick={() => signInWithPopup(auth, provider)}
          className="bg-black text-white px-6 py-3 rounded-lg"
        >
          Googleでログイン
        </button>
      </div>
    );
  }

  const total = articles.length;
  const done = articles.filter(a => a.status === "完了").length;
  const rate = total === 0 ? 0 : Math.round((done / total) * 100);

  const chartData = [
    { name: "未対策", value: articles.filter(a => a.status === "未対策").length },
    { name: "リライト中", value: articles.filter(a => a.status === "リライト中").length },
    { name: "完了", value: done },
  ];

  return (
    <div className="flex-1 p-8 bg-gray-100">
      <div className="max-w-5xl mx-auto space-y-6">

        <h1 className="text-2xl font-bold">記事改善ダッシュボード</h1>

        {/* 入力 */}
        <div className="bg-white p-4 rounded-xl shadow flex gap-2">
          <input
            value={title}
            onChange={(e)=>setTitle(e.target.value)}
            placeholder="記事タイトル"
            className="flex-1 border rounded px-3 py-2"
          />
          <input
            value={keyword}
            onChange={(e)=>setKeyword(e.target.value)}
            placeholder="キーワード"
            className="flex-1 border rounded px-3 py-2"
          />
          <button
            onClick={addArticle}
            className="bg-black text-white px-4 py-2 rounded"
          >
            追加
          </button>
        </div>

        {/* KPI */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white p-4 rounded-xl shadow">
            <p className="text-sm">記事数</p>
            <p className="text-2xl font-bold">{total}</p>
          </div>
          <div className="bg-white p-4 rounded-xl shadow">
            <p className="text-sm">未対策</p>
            <p className="text-2xl font-bold">
              {articles.filter(a=>a.status==="未対策").length}
            </p>
          </div>
          <div className="bg-white p-4 rounded-xl shadow">
            <p className="text-sm">完了率</p>
            <p className="text-2xl font-bold">{rate}%</p>
          </div>
        </div>

        {/* フィルター */}
        <div className="flex gap-2">
          {["ALL","未対策","リライト中","完了"].map(s => (
            <button
              key={s}
              onClick={()=>setFilterStatus(s)}
              className={`px-3 py-1 rounded ${
                filterStatus === s ? "bg-black text-white" : "bg-gray-200"
              }`}
            >
              {s === "ALL" ? "全て" : s}
            </button>
          ))}
        </div>

        {/* 🔥 ランキング（順位表示） */}
        <div className="bg-white p-4 rounded-xl shadow">
          <h2 className="font-bold mb-2">改善優先記事</h2>
          {rankedArticles.map((a, index) => (
            <div key={a.id} className="text-sm border-b py-2 flex justify-between">
              <div className="flex gap-2 items-center">
                <span className={`font-bold ${
                  index === 0 ? "text-yellow-500" :
                  index === 1 ? "text-gray-400" :
                  index === 2 ? "text-orange-400" :
                  "text-gray-500"
                }`}>
                  {index + 1}位
                </span>
                <span>{a.title}</span>
              </div>
              <span className="text-gray-400">{a.score}</span>
            </div>
          ))}
        </div>

        {/* 🔥 グラフ修正 */}
        <div className="bg-white p-6 rounded-xl shadow flex justify-center">
          <PieChart width={350} height={300}>
            <Pie
              data={chartData}
              dataKey="value"
              cx="50%"
              cy="50%"
              outerRadius={100}
              onClick={(data) => setFilterStatus(data.name)}
            >
              <Cell fill="#9CA3AF" />
              <Cell fill="#FACC15" />
              <Cell fill="#34D399" />
              <Label
                value={`完了率\n${rate}%`}
                position="center"
                style={{
                  fontSize: "16px",
                  fontWeight: "bold",
                  textAnchor: "middle"
                }}
              />
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        </div>

        {/* 一覧（そのまま） */}
        <div className="space-y-3">
          {filteredArticles.map(a => (
            <div key={a.id} className="bg-white p-4 rounded-xl shadow flex justify-between">
              <div>

                {editingId === a.id ? (
                  <>
                    <input value={editTitle} onChange={(e)=>setEditTitle(e.target.value)} className="border px-2 py-1 rounded mb-1" />
                    <input value={editKeyword} onChange={(e)=>setEditKeyword(e.target.value)} className="border px-2 py-1 rounded mb-2" />

                    <div className="flex gap-2">
                      <button onClick={()=>saveEdit(a.id)} className="bg-green-500 text-white px-2 py-1 rounded">保存</button>
                      <button onClick={()=>setEditingId(null)} className="bg-gray-300 px-2 py-1 rounded">キャンセル</button>
                    </div>
                  </>
                ) : (
                  <>
                    <p className="font-semibold">{a.title}</p>
                    <p className="text-sm text-gray-500">{a.keyword}</p>
                  </>
                )}

                <p className="text-xs text-gray-400">
                  PV: {a.pv} / CTR: {a.ctr}% / Imp: {a.impressions}
                </p>

                <p className="text-xs text-red-500">
                  {getSuggestion(a)}
                </p>
              </div>

              <div className="flex gap-2">
                <button onClick={()=>changeStatus(a.id,"未対策")} className="px-2 py-1 bg-gray-200 rounded">未</button>
                <button onClick={()=>changeStatus(a.id,"リライト中")} className="px-2 py-1 bg-yellow-200 rounded">中</button>
                <button onClick={()=>changeStatus(a.id,"完了")} className="px-2 py-1 bg-green-200 rounded">完</button>
                <button onClick={()=>startEdit(a)} className="text-blue-500">編集</button>
                <button onClick={()=>deleteArticle(a.id)} className="text-red-500">削除</button>
              </div>

            </div>
          ))}
        </div>

      </div>
    </div>
  );
}

export default App;