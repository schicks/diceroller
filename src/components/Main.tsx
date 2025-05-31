import { useState } from "react";
import { Login } from "./Login";
import App from "../App";
import {
    isValidAutomergeUrl,
    Repo,
    WebSocketClientAdapter,
    IndexedDBStorageAdapter,
    RepoContext,
    type AutomergeUrl,
} from "@automerge/react";

const repo = new Repo({
    network: [new WebSocketClientAdapter("wss://sync.automerge.org")],
    storage: new IndexedDBStorageAdapter(),
});

export function Main() {
    const [userId, setUserId] = useState<string | null>(null);
    const [docUrl, setDocUrl] = useState<AutomergeUrl | null>(null);

    const handleLogin = async (username: string) => {
        setUserId(username);
        const rootDocUrl = `${document.location.hash.substring(1)}`;
        let handle;
        if (isValidAutomergeUrl(rootDocUrl)) {
            handle = await repo.find(rootDocUrl);
        } else {
            handle = repo.create();
        }
        const url = handle.url;
        document.location.hash = url;
        setDocUrl(url);
    };

    if (!userId) {
        return <Login onLogin={handleLogin} />;
    }

    if (!docUrl) {
        return <div>Loading...</div>;
    }

    return (
        <RepoContext.Provider value={repo}>
            <App docUrl={docUrl} userId={userId} />
        </RepoContext.Provider>
    );
} 