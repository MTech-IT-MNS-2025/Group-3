import { useState } from "react";
import toast from "react-hot-toast";
import { useRC4 } from "../hook/rc4hook";


export default function Home() {
    const [darkMode, setDarkMode] = useState(false);
    const [inputText, setInputText] = useState("");
    const [key, setKey]=useState("");
    const [resultText, setResultText] = useState("");
    const [LoadingEncryption, setLoadingEncryption] = useState(false);
    const [LoadingDecryption, setLoadingDecryption] = useState(false);
    
    const { encrypt: rc4Encrypt, decrypt: rc4Decrypt, isLoaded } = useRC4();

    const light = {
        page: "bg-[#F1F5F9]",
        card: "bg-[#E2E8F0] text-[#1E293B] border-[#64748B]",
        input: "bg-white text-[#1E293B] border-[#64748B] placeholder-gray-500 focus:ring-[#475569]",
        button: "bg-[#475569] hover:bg-[#334155] text-white",
        toast: "bg-white/80 border-[#64748B] text-black"
    };

    const dark = {
        page: "bg-[#0F172A]",
        card: "bg-[#1E293B] text-[#F1F5F9] border-[#94A3B8]",
        input: "bg-[#0F172A] text-[#F1F5F9] border-[#94A3B8] placeholder-gray-400 focus:ring-[#64748B]",
        button: "bg-[#64748B] hover:bg-[#475569] text-white",
        toast: "bg-[#1E293B]/80 border-[#94A3B8] text-white"
    };

    const theme = darkMode ? dark : light;

    const showToast = (msg) => {
        toast.custom((t) => (
            <div 
                className={`px-4 py-3 rounded-xl shadow-lg border transform transition-all ${
                    t.visible ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-4"
                } ${theme.toast}`}
            >
                <p className="text-sm">{msg}</p>
            </div>
        ));
    };

    const copyToClipboard = async () => {
        try {
            if (navigator.clipboard && window.isSecureContext) {
                await navigator.clipboard.writeText(resultText);
            } else {
                // Fallback for iOS/Safari/older devices
                const textarea = document.createElement("textarea");
                textarea.value = resultText;
                textarea.style.position = "fixed";
                textarea.style.opacity = "0";
                document.body.appendChild(textarea);
                textarea.focus();
                textarea.select();
                document.execCommand("copy");
                document.body.removeChild(textarea);
            }

            showToast("Copied to clipboard!");
        } catch (err) {
            showToast("Failed to copy!");
        }
    };

    const Encrypt = () => {
        if (!isLoaded) return showToast("WASM Module not loaded yet!");
        if(!inputText && !key) return showToast("Please enter a input text and key!");
        if (!inputText) return showToast("Please enter a input text");
        if (!key) return showToast("Please enter a key!");

        try {
            setLoadingEncryption(true);
            const encrypted = rc4Encrypt(inputText, key);
            setLoadingEncryption(false);
            setResultText(encrypted);
            showToast("Encryption Successful!");
        } catch (error) {
            showToast("Error during encryption.");
            setLoadingEncryption(false)
        }
    };

    const Decrypt = () => {
        if (!isLoaded) return showToast("WASM Module not loaded yet!");
        if(!inputText && !key) return showToast("Please enter a input text and key!");
        if (!inputText) return showToast("Please enter a input text");
        if (!key) return showToast("Please enter a key!");


        try {
            setLoadingDecryption(true);
            const decrypted = rc4Decrypt(inputText, key);
            setLoadingDecryption(false);
            setResultText(decrypted);
            showToast("Decryption Successful!");
        } catch (error) {
            showToast("Error during decryption.");
            setLoadingDecryption(false);
        }  
    };


    return (
        <div className={`min-h-screen flex items-center justify-center transition-all duration-300 ${theme.page}`}>
            <div className={`p-8 rounded-2xl shadow-lg w-96 border transition-all duration-300 ${theme.card}`}>

                {/* Header + Dark Mode Toggle */}
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-xl font-bold">RC4 Encryption System</h1>

                    <button
                        onClick={() => setDarkMode(!darkMode)}
                        className={`px-3 py-1 text-sm rounded-lg transition duration-300 ${theme.button}`}
                    >
                        {darkMode ? "Light" : "Dark"}
                    </button>
                </div>


                <div className="flex flex-col space-y-4">

                    {/* Input Textarea */}
                    <div>
                        <textarea
                            value={inputText}
                            onChange={(e) => setInputText(e.target.value)}
                            placeholder="Enter Plain Text / Cipher Text"
                            className={`p-3 rounded-lg w-full border focus:outline-none focus:ring-2 transition ${theme.input}`}
                        />
                        <p className="text-xs text-right opacity-70 mt-1">{inputText.length} characters</p>
                    </div>

                    {/* Key Input */}
                    <input
                        type="text"
                        placeholder="Enter Key"
                        value={key}
                        onChange={(e) => setKey(e.target.value)}
                        className={`p-3 rounded-lg border focus:outline-none focus:ring-2 transition ${theme.input}`}
                    />

                    {/* Buttons */}
                    <div className="flex justify-around space-x-4">
                        <button
                            className={`flex-1 p-3 rounded-lg transition duration-300 ${theme.button}`}
                            onClick={Encrypt}
                            disabled={!isLoaded}
                        >
                            {LoadingEncryption ? "Encrypting..." : "Encrypt"}
                        </button>

                        <button
                            className={`flex-1 p-3 rounded-lg transition duration-300 ${theme.button}`}
                            onClick={Decrypt}
                            disabled={!isLoaded}
                        >
                            {LoadingDecryption ? "Decrypting..." : "Decrypt"}
                        </button>
                    </div>

                    {/* Output + Copy */}
                    <div>
                        <textarea
                            readOnly
                            placeholder="Result"
                            value={resultText}
                            className={`p-3 rounded-lg w-full border focus:outline-none transition ${theme.input}`}
                        />

                        <div className="flex justify-between items-center mt-1">
                            <p className="text-xs opacity-70">{resultText.length} characters</p>
                            
                            <button
                                onClick={copyToClipboard}
                                className={`text-xs px-2 py-1 rounded transition ${theme.button}`}
                            >
                                Copy
                            </button>
                        </div>
                    </div>

                </div>

            </div>
        </div>
    );
}
