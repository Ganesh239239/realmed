# Build Drogon with HTTP upload support ENABLED
RUN git clone --recurse-submodules https://github.com/drogonframework/drogon.git /tmp/drogon && \
    cd /tmp/drogon && \
    mkdir build && cd build && \
    cmake .. \
      -DCMAKE_BUILD_TYPE=Release \
      -DDROGON_ENABLE_HTTP_UPLOAD=ON && \
    make -j$(nproc) && \
    make install && \
    ldconfig && \
    rm -rf /tmp/drogon
