import { FaSearch, FaEllipsisV } from "react-icons/fa";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/router";

export default function UserList({ users = [], allUsers = [], onSelectUser, username = "" }) {
  const [showDropdown, setShowDropdown] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const router = useRouter();
  const dropdownRef = useRef(null);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("username");
    router.replace("/");
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Search handler
  useEffect(() => {
    if (searchTerm.trim() === "") {
      setFilteredUsers([]);
      setShowSuggestions(false);
      return;
    }
    const regex = new RegExp(searchTerm, "i");
    const matched = allUsers.filter((user) => regex.test(user.username));
    setFilteredUsers(matched);
    setShowSuggestions(matched.length > 0);
  }, [searchTerm, allUsers]);

  const handleSelectSearchUser = (user) => {
    setSearchTerm("");
    setShowSuggestions(false);
    onSelectUser(user);
  };

  return (
    <div className="w-1/4 bg-gray-100 border-r border-gray-300 flex flex-col overflow-x-hidden">
      {/* Header */}
      <div className="flex justify-between items-center border-b border-gray-300 px-4 py-3">
        <div className="relative group">
          <div className="w-9 h-9 bg-blue-500 text-white rounded-full flex items-center justify-center font-bold cursor-pointer">
            {username ? username[0].toUpperCase() : "?"}
          </div>
          {username && (
            <span className="absolute left-1/2 -translate-x-1/5 top-full mb-2 px-2 py-1 rounded bg-gray-800 text-white text-xs opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
              {username}
            </span>
          )}
        </div>
        <h2 className="font-bold text-xl text-gray-700">Chats</h2>
        <div className="relative" ref={dropdownRef}>
          <button onClick={() => setShowDropdown(!showDropdown)}>
            <FaEllipsisV className="text-gray-500 hover:text-gray-700" />
          </button>
          {showDropdown && (
            <div className="absolute right-0 mt-2 w-32 bg-white border border-gray-200 rounded shadow-lg z-20">
              <button
                onClick={handleLogout}
                className="w-full text-left px-4 py-2 hover:bg-gray-100 text-gray-700"
              >
                Logout
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Search */}
      <div className="relative w-full p-3">
        <FaSearch className="absolute left-6 top-1/2 transform -translate-y-1/2 text-gray-500" />
        <input
          type="text"
          value={searchTerm}
          placeholder="Search users..."
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full border border-gray-300 p-2 pl-10 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
        />
        {showSuggestions && (
          <ul className="absolute left-3 right-3 mt-1 max-h-48 overflow-y-auto bg-white border border-gray-200 rounded-md shadow-lg z-10">
            {filteredUsers.map((user) => (
              <li
                key={user._id}
                onClick={() => handleSelectSearchUser(user)}
                className="px-2 py-2 hover:bg-blue-100 cursor-pointer"
              >
                {user.username}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Recent Chats */}
      <ul className="overflow-y-auto flex-1 scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-gray-200">
        {users.length > 0 ? (
          users.map((user) => (
            <li
              key={user._id}
              onClick={() => onSelectUser(user)}
              className="px-4 py-3 hover:bg-blue-100 cursor-pointer text-gray-800 border-b border-gray-200 transition-colors duration-150"
            >
              {user.username}
            </li>
          ))
        ) : (
          <p className="text-center text-gray-500 mt-10">No chats yet</p>
        )}
      </ul>
    </div>
  );
}
