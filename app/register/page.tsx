import RegisterForm from '@/components/auth/RegisterForm'

export default function RegisterPage() {
    return (
        <main className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
            <div className="w-full max-w-[440px] rounded-[2.5rem] border border-slate-200 bg-white p-8 md:p-12 shadow-2xl glass-card">
                <RegisterForm />
            </div>
        </main>
    )
}
