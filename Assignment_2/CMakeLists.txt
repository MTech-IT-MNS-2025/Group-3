cmake_minimum_required(VERSION 3.10)
project(LibOQS_PQC_Demos C)

set(CMAKE_C_STANDARD 11)
set(CMAKE_C_STANDARD_REQUIRED ON)

# Find liboqs
find_package(PkgConfig REQUIRED)
pkg_check_modules(LIBOQS REQUIRED liboqs)

# Find OpenSSL (for classical crypto comparison in sig_demo)
find_package(OpenSSL REQUIRED)

# Include directories
include_directories(${LIBOQS_INCLUDE_DIRS} ${OPENSSL_INCLUDE_DIR})

# Link directories
link_directories(${LIBOQS_LIBRARY_DIRS})

# Executables
add_executable(list_algos list_algos.c)
add_executable(kem_kyber512 kem_kyber512.c)
add_executable(sig_falcon sign_falcon512.c)

# Link libraries
target_link_libraries(list_algos ${LIBOQS_LIBRARIES} OpenSSL::Crypto OpenSSL::SSL)
target_link_libraries(kem_kyber512 ${LIBOQS_LIBRARIES} OpenSSL::Crypto OpenSSL::SSL)
target_link_libraries(sig_falcon ${LIBOQS_LIBRARIES} OpenSSL::Crypto OpenSSL::SSL)

# Optional: print summary
message(STATUS "✅ Build ready for liboqs PQC demos:")
message(STATUS "   - list_algorithms")
message(STATUS "   - kem_demo (Kyber512)")
message(STATUS "   - sig_demo (Falcon512)")