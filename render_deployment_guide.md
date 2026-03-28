# Render Deployment Guide - EduMitra

Follow these steps to deploy your application to Render manually.

## 🚀 Step 1: Create a New Web Service
1. Log in to your [Render Dashboard](https://dashboard.render.com/).
2. Click **New +** and select **Web Service**.
3. Connect your GitHub repository containing the **EduMitra** code.

## ⚙️ Step 2: Configure Service Settings
Use the following settings in the Render creation form:

| Setting | Value |
| :--- | :--- |
| **Name** | `edumitra` |
| **Runtime** | `Python 3` |
| **Build Command** | `pip install -r requirements.txt && python train_and_seed.py` |
| **Start Command** | `gunicorn main:app -w 4 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:$PORT` |

## 🔑 Step 3: Set Environment Variables
Click **Advanced** or find the **Environment** tab and add these keys:

| Key | Value |
| :--- | :--- |
| `DATABASE_URL` | *Your Supabase Connection String (Transaction Pooler recommended)* |
| `SECRET_KEY` | *A long random string for JWT security* |
| `SMTP_SERVER` | `smtp.gmail.com` |
| `SMTP_PORT` | `587` |
| `SMTP_USERNAME` | *Your Gmail address* |
| `SMTP_PASSWORD` | *Your Gmail App Password* |
| `ADMIN_EMAIL` | *Your primary alert email* |
| `PYTHON_VERSION` | `3.11.7` |

## 🛠️ Step 4: Finalize & Deploy
1. Click **Create Web Service**.
2. Render will begin the build process (installing dependencies and training the performance model).
3. Once the log shows `Application startup complete`, your app is live!

> [!TIP]
> **Database Initialization**: The `train_and_seed.py` script in the Build Command ensures your tables are created and the performance model is trained every time you deploy. You do NOT need to run `setup_db.py` manually on Render.

> [!IMPORTANT]
> **Health Check**: Render might ask for a health check path. Use `/api/health` which I just added to the code.
