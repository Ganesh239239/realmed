FROM ubuntu:22.04

RUN apt-get update && apt-get install -y \
    build-essential cmake \
    libssl-dev libjsoncpp-dev \
    libpodofo-dev qpdf \
    libdrogon-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY . .

RUN mkdir build && cd build && \
    cmake .. && \
    make -j$(nproc)

EXPOSE 8080
CMD ["./build/pdf_editor_api"]
