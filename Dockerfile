# Используем официальный образ Node.js 16 в качестве базового образа
FROM node:latest

# Установка необходимых зависимостей для запуска Chrome
RUN apt-get update && apt-get install -y \
    wget \
    gnupg \
    ca-certificates \
    apt-transport-https \
    xvfb \
    openssh-server \
    && rm -rf /var/lib/apt/lists/*

# Установка Google Chrome
RUN wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | apt-key add - \
    && echo "deb [arch=amd64] https://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list \
    && apt-get update \
    && apt-get install -y google-chrome-stable \
    && rm -rf /var/lib/apt/lists/*

# Установка рабочего каталога в контейнере
WORKDIR /app

# Копирование файлов package.json и package-lock.json в рабочий каталог
COPY package*.json ./

# Установка зависимостей Node.js с помощью npm
RUN npm install

# Копирование остальных файлов приложения в рабочий каталог
COPY . .

# Открытие порта, на котором работает ваше приложение
EXPOSE 3000

# Установка и настройка SSH
RUN mkdir -p /run/sshd /root/.ssh && \
    ssh-keygen -q -t rsa -N '' -f /root/.ssh/id_rsa && \
    cat /root/.ssh/id_rsa.pub >> /root/.ssh/authorized_keys && \
    chmod 600 /root/.ssh/authorized_keys && \
    chmod 700 /root/.ssh

# Открытие порта SSH
EXPOSE 22


# Запуск SSH-сервера
CMD ["/usr/sbin/sshd", "-D"]
