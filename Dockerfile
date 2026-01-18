FROM ubuntu:22.04

ENV DEBIAN_FRONTEND=noninteractive

# Install system dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    cmake \
    git \
    libssl-dev \
    libjsoncpp-dev \
    libpodofo-dev \
    qpdf \
    && rm -rf /var/lib/apt/lists/*

# Build and install Drogon from source
RUN git clone https://github.com/drogonframework/drogon.git /tmp/drogon && \
    cd /tmp/drogon && \
    mkdir build && cd build && \
    cmake .. && \
    make -j$(nproc) && \
    make install && \
    ldconfig && \
    rm -rf /tmp/drogon

WORKDIR /app
COPY . .

RUN mkdir build && cd build && \
    cmake .. && \
    make -j$(nproc)

EXPOSE 8080
CMD ["./build/pdf_editor_api"]
