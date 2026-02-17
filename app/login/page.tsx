import LoginForm from '@/components/auth/LoginForm'

export default function LoginPage() {
    return (
        <main className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
            <div className="w-full max-w-[400px] rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
                <LoginForm />
            </div>
        </main>
    )
}
