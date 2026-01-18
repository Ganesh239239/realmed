FROM ubuntu:22.04

ENV DEBIAN_FRONTEND=noninteractive

# 1. Install ALL required dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    cmake \
    git \
    libssl-dev \
    libjsoncpp-dev \
    libpodofo-dev \
    qpdf \
    libboost-all-dev \
    zlib1g-dev \
    uuid-dev \
    libsqlite3-dev \
    && rm -rf /var/lib/apt/lists/*

# 2. Build Drogon from source (stable method)
RUN git clone --depth=1 https://github.com/drogonframework/drogon.git /tmp/drogon && \
    cd /tmp/drogon && \
    mkdir build && cd build && \
    cmake .. -DCMAKE_BUILD_TYPE=Release && \
    make -j$(nproc) && \
    make install && \
    ldconfig && \
    rm -rf /tmp/drogon

# 3. Build your application
WORKDIR /app
COPY . .

RUN mkdir build && cd build && \
    cmake .. && \
    make -j$(nproc)

EXPOSE 8080
CMD ["./build/pdf_editor_api"]
