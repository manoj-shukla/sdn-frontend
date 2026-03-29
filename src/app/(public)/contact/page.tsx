export default function ContactPage() {
    return (
        <div className="container mx-auto py-20 px-4 text-center">
            <h1 className="text-4xl font-bold mb-6">Contact Us</h1>
            <p className="text-lg text-muted-foreground mb-4">We'd love to hear from you.</p>
            <div className="text-left max-w-md mx-auto space-y-4">
                <p><strong>Email:</strong> support@sdn.tech</p>
                <p><strong>Phone:</strong> +1 (555) 123-4567</p>
                <p><strong>Address:</strong> 123 Tech Blvd, Innovation City</p>
            </div>
        </div>
    );
}
