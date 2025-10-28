import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen, Users, Award, TrendingUp, Check } from "lucide-react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Link } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";

const Index = () => {
  const { t } = useLanguage();

  const features = [
    {
      icon: BookOpen,
      title: t('interactiveLearning'),
      description: t('interactiveLearningDesc')
    },
    {
      icon: Users,
      title: t('expertTeachers'),
      description: t('expertTeachersDesc')
    },
    {
      icon: Award,
      title: t('certifications'),
      description: t('certificationsDesc')
    },
    {
      icon: TrendingUp,
      title: t('trackProgress'),
      description: t('trackProgressDesc')
    }
  ];

  const steps = [
    { number: "01", title: t('createAccount'), description: t('createAccountDesc') },
    { number: "02", title: t('choosePath'), description: t('choosePathDesc') },
    { number: "03", title: t('startLearning'), description: t('startLearningDesc') },
    { number: "04", title: t('achieveGoals'), description: t('achieveGoalsDesc') }
  ];

  const testimonials = [
    {
      name: "Sarah Johnson",
      role: "Student",
      image: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&h=150&fit=crop",
      quote: "This platform transformed how I learn. The teachers are amazing and the courses are well-structured!"
    },
    {
      name: "Michael Chen",
      role: "Teacher",
      image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop",
      quote: "As a teacher, I've found the perfect platform to share my knowledge and reach students worldwide."
    },
    {
      name: "Emily Rodriguez",
      role: "Student",
      image: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop",
      quote: "The interactive features and progress tracking keep me motivated. Best learning experience ever!"
    }
  ];

  const plans = [
    {
      name: "Starter",
      price: "$9.99",
      period: "/month",
      features: [t('upTo3Courses'), t('basicAnalytics'), t('emailSupport'), t('certificateCompletion')],
      popular: false
    },
    {
      name: "Professional",
      price: "$29.99",
      period: "/month",
      features: [t('unlimitedCourses'), t('advancedAnalytics'), t('prioritySupport'), t('customBranding'), t('studentManagement')],
      popular: true
    },
    {
      name: "Enterprise",
      price: "$99.99",
      period: "/month",
      features: [t('everythingInPro'), t('apiAccess'), t('dedicatedSupport'), t('customIntegrations'), t('whiteLabelSolution')],
      popular: false
    }
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      
      {/* Hero Section */}
      <section className="relative bg-primary py-20 px-4 md:py-32">
        <div className="container mx-auto max-w-6xl text-center">
          <h1 className="font-heading text-4xl md:text-6xl font-bold text-primary-foreground mb-6 animate-fade-in">
            {t('heroTitle')}
          </h1>
          <p className="text-lg md:text-xl text-primary-foreground/90 mb-8 max-w-2xl mx-auto">
            {t('heroDescription')}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild size="lg" className="text-lg px-8 py-6">
              <Link to="/student-login">
                {t('registerAsStudent')}
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="text-lg px-8 py-6">
              <Link to="/register/teacher">
                {t('registerAsTeacher')}
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 md:py-24 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <h2 className="font-heading text-3xl md:text-4xl font-bold text-foreground mb-4">
              {t('featuresTitle')}
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              {t('featuresDescription')}
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <Card key={index} className="border-2 hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="w-12 h-12 bg-accent/10 rounded-lg flex items-center justify-center mb-4">
                    <feature.icon className="w-6 h-6 text-accent" />
                  </div>
                  <CardTitle className="font-heading">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-16 md:py-24 px-4 bg-secondary">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <h2 className="font-heading text-3xl md:text-4xl font-bold text-foreground mb-4">
              {t('howItWorksTitle')}
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              {t('howItWorksDescription')}
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {steps.map((step, index) => (
              <div key={index} className="text-center">
                <div className="w-20 h-20 bg-accent rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-3xl font-bold text-accent-foreground">{step.number}</span>
                </div>
                <h3 className="font-heading text-xl font-semibold text-foreground mb-2">{step.title}</h3>
                <p className="text-muted-foreground">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-16 md:py-24 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <h2 className="font-heading text-3xl md:text-4xl font-bold text-foreground mb-4">
              {t('testimonialsTitle')}
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              {t('testimonialsDescription')}
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <Card key={index} className="border-2">
                <CardContent className="pt-6">
                  <div className="flex items-center mb-4">
                    <img
                      src={testimonial.image}
                      alt={testimonial.name}
                      className="w-16 h-16 rounded-full object-cover mr-4"
                    />
                    <div>
                      <h4 className="font-semibold text-foreground">{testimonial.name}</h4>
                      <p className="text-sm text-muted-foreground">{testimonial.role}</p>
                    </div>
                  </div>
                  <p className="text-muted-foreground italic">"{testimonial.quote}"</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-16 md:py-24 px-4 bg-secondary">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <h2 className="font-heading text-3xl md:text-4xl font-bold text-foreground mb-4">
              {t('pricingTitle')}
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              {t('pricingDescription')}
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {plans.map((plan, index) => (
              <Card key={index} className={`border-2 ${plan.popular ? 'border-accent shadow-xl scale-105' : ''}`}>
                {plan.popular && (
                  <div className="bg-accent text-accent-foreground text-center py-2 font-semibold rounded-t-lg">
                    {t('mostPopular')}
                  </div>
                )}
                <CardHeader>
                  <CardTitle className="font-heading text-2xl">{plan.name}</CardTitle>
                  <CardDescription>
                    <span className="text-4xl font-bold text-foreground">{plan.price}</span>
                    <span className="text-muted-foreground">{plan.period}</span>
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3">
                    {plan.features.map((feature, fIndex) => (
                      <li key={fIndex} className="flex items-start">
                        <Check className="w-5 h-5 text-success mr-2 mt-0.5 flex-shrink-0" />
                        <span className="text-muted-foreground">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
                <CardFooter>
                  <Button 
                    className={`w-full ${plan.popular ? 'bg-accent hover:bg-accent/90' : ''}`}
                    variant={plan.popular ? 'default' : 'outline'}
                  >
                    {t('getStarted')}
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Index;
