import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import useModExp from "../hooks/useModExp";


export default function Home() {
    const [inputP, setInputP] = useState("");
    const [inputG, setInputG] = useState("");
    const [result, setResult] = useState("");

    const { modexp, isLoaded } = useModExp();


    const Connect = async () => {
        const a = 1 + Math.floor(Math.random() * (inputP - 1));
        console.log("Private Key a: ", a);
        if (!isLoaded) return alert("WASM not loaded yet!");
        const res = modexp(Number(inputG), Number(a), Number(inputP));
        console.log("Computed Public Key: ", res);
        toast.success("Key Generated Successfully! at client side.");
        const payload={
            g: inputG.toString(),
            p: inputP.toString(),
            x: res.toString()
        }
        console.log("Client: Sending g, p, x to server...  ", {
            inputG, inputP, res,
            types: {
                inputG: typeof(inputG),
                inputP: typeof(inputP),
                res: typeof(res)
            }
        });
        const result = await fetch("/api/useModExpApi", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        });

        const { K, y} = await result.json();

        setResult(`Shared Secret Key at Client K: ${K}\nReceived Public Key from Server y: ${y}\n Private Key of Client a: ${a}`);

    };

    


    return (
        <div className="flex items-center justify-center h-screen bg-gray-100">
            <div className="bg-white p-8 rounded-2xl shadow-md w-96 border border-gray-200">
                <h1 className="text-2xl font-bold mb-6 text-center text-gray-800">
                    Diffie-Hellman Key Exchange
                </h1>

                <div className="flex flex-col space-y-3">
                    <input
                        type="number"
                        value={inputP}
                        placeholder="Enter a value of p (prime number)"
                        onChange={(e) => setInputP(e.target.value)}
                        className="border border-gray-400 p-2 mb-4 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />

                    <input
                        type="number"
                        value={inputG}
                        placeholder="Enter a value of g (generator)"
                        onChange={(e) => setInputG(e.target.value)}
                        className="border border-gray-400 p-2 mb-4 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />

                    <button
                        type="submit"
                        onClick={Connect}
                        className={ "bg-blue-500 hover:bg-blue-600 text-white p-2 rounded-md transition duration-200"}
                    >
                        Connect
                    </button>

                    <textarea
                        rows={4}
                        readOnly
                        placeholder="Result"
                        value={result}
                        className={"border border-gray-400 p-2 mb-4 rounded-md outline-none"}
                    />
                </div>
            </div>
        </div>
    );
}


// p=11,  g=2