import React from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import {
  ArrowRight,
  Image as ImageIcon,
  FileText,
  Type,
  Globe,
  Zap,
  Shield,
  Layout,
  Layers,
  Github,
} from "lucide-react";

const HomePage = () => {
  const categories = [
    {
      title: "Image Tools",
      icon: <ImageIcon className="h-10 w-10 mb-4 text-chart-1" />,
      description:
        "Your go-to suite for all image manipulation needs. Convert, compress, resize, and edit images instantly.",
      link: "/images",
      tools: [
        "Image Converter",
        "Compressor",
        "Resizer",
        "Cropper",
        "Grayscaler",
        "Flipper",
      ],
    },
    {
      title: "PDF Tools",
      icon: <FileText className="h-10 w-10 mb-4 text-destructive" />,
      description:
        "Comprehensive tools for managing PDF documents. Merge, split, compress, protect, and convert PDFs with ease.",
      link: "/pdfs",
      tools: [
        "PDF Merger",
        "Splitter",
        "Compressor",
        "Password Protect",
        "PDF to Text",
        "Text to PDF",
      ],
    },
    {
      title: "Text Tools",
      icon: <Type className="h-10 w-10 mb-4 text-chart-2" />,
      description:
        "Versatile utilities for text processing. Convert cases, compare texts, encode/decode, and generate passwords.",
      link: "/text",
      tools: [
        "Case Converter",
        "Diff Checker",
        "Base64",
        "JSON Formatter",
        "Hash Generator",
      ],
    },
    {
      title: "Web Tools",
      icon: <Globe className="h-10 w-10 mb-4 text-chart-4" />,
      description:
        "Essential tools for web tasks. URL shortener, QR codes, screenshots, favicon extraction, and more.",
      link: "/web",
      tools: [
        "URL Shortener",
        "QR Generator",
        "Screenshot",
        "Favicon Extractor",
        "Password Strength",
      ],
    },
  ];

  return (
    <>
      <Helmet>
        <title>dkutils - Your One-Stop Solution for Everyday Tools</title>
        <meta
          name="description"
          content="dkutils provides a comprehensive suite of free online tools for image, PDF, text, and web manipulation. Simplify your daily conversions and boost productivity with our versatile and user-friendly tools."
        />
        <meta
          name="keywords"
          content="dkutils, online tools, image tools, PDF tools, text tools, web tools, converter, compressor, resizer"
        />
        <meta
          property="og:title"
          content="dkutils - Your One-Stop Solution for Everyday Tools"
        />
        <meta
          property="og:description"
          content="dkutils provides a comprehensive suite of free online tools for image, PDF, text, and web manipulation."
        />
        <meta property="og:image" content="/logo.png" />
        <meta property="og:url" content="https://dkutils.vercel.app/" />
      </Helmet>

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-8 pb-12 md:pt-20 md:pb-32 lg:pt-32 lg:pb-40">
        {/* Background Pattern */}
        <div className="absolute inset-x-0 -top-20 -z-10 transform-gpu overflow-hidden blur-3xl sm:-top-80">
          <div className="relative left-[calc(50%-11rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 rotate-[30deg] bg-gradient-to-tr from-[#ff80b5] to-[#9089fc] opacity-20 sm:left-[calc(50%-30rem)] sm:w-[72.1875rem] dark:from-[#3b82f6] dark:to-[#14b8a6]"></div>
        </div>

        <div className="container px-4 md:px-6 flex max-w-[64rem] flex-col items-center gap-6 md:gap-10 text-center mx-auto">
          <div className="inline-flex items-center rounded-full border border-chart-2/20 bg-chart-2/10 px-3 py-1 text-sm font-medium text-chart-2 backdrop-blur-md ">
            <span className="mr-2 flex h-2 w-2 rounded-full animate-pulse bg-chart-2/100"></span>
            <span>Open Source & Free Forever 🚀</span>
          </div>

          <h1 className="font-heading text-4xl font-black leading-tight tracking-tighter sm:text-5xl md:text-6xl lg:text-7xl">
            Everything you need to <br className="hidden sm:inline" />
            <span className="text-primary bg-clip-text text-transparent bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-400 dark:from-blue-400 dark:via-blue-300 dark:to-cyan-300">
              Manage Your Files
            </span>
          </h1>

          <p className="max-w-[42rem] leading-normal text-muted-foreground sm:text-xl sm:leading-8">
            Convert, compress, edit, and analyze images, PDFs, text, and web
            resources instantly. No server uploads for most tools - secure,
            fast, and free.
          </p>

          <div className="flex flex-col w-full sm:flex-row justify-center gap-3 sm:gap-4 sm:w-auto mt-2">
            <Button
              size="xl"
              className="w-full sm:w-auto h-12 px-8 text-base md:text-lg font-semibold shadow-lg shadow-primary/20"
              asChild
            >
              <Link to="/images">
                Start converting <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button
              size="xl"
              variant="outline"
              className="w-full sm:w-auto h-12 px-8 text-base md:text-lg bg-background/50 backdrop-blur-sm"
              asChild
            >
              <Link to="/pdfs">Explore Tools</Link>
            </Button>
          </div>
        </div>

        {/* Bottom decorative gradient */}
        <div className="absolute inset-x-0 top-[calc(100%-13rem)] -z-10 transform-gpu overflow-hidden blur-3xl sm:top-[calc(100%-30rem)]">
          <div className="relative left-[calc(50%+3rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 bg-gradient-to-tr from-[#ff80b5] to-[#9089fc] opacity-20 sm:left-[calc(50%+36rem)] sm:w-[72.1875rem] dark:from-[#3b82f6] dark:to-[#14b8a6]"></div>
        </div>
      </section>

      {/* Categories Grid */}
      <section className="container space-y-6 bg-muted/30 py-8 dark:bg-transparent md:py-12 lg:py-24 max-w-7xl mx-auto px-4 md:px-6 rounded-3xl">
        <div className="mx-auto flex max-w-[58rem] flex-col items-center space-y-4 text-center">
          <h2 className="font-heading text-3xl leading-[1.1] sm:text-3xl md:text-6xl font-bold">
            Tools for Everyone
          </h2>
          <p className="max-w-[85%] leading-normal text-muted-foreground sm:text-lg sm:leading-7">
            From developers to designers, students to professionals, we have the
            tools you need to get the job done.
          </p>
          <p className="text-sm text-muted-foreground border p-2 rounded-md bg-muted/50">
            Authenticated users get increased file size limits (50MB).{" "}
            <Link
              to="/login"
              className="underline underline-offset-4 hover:text-primary font-medium"
            >
              Log in now
            </Link>
            .
          </p>
        </div>

        <div className="mx-auto grid justify-center gap-6 sm:grid-cols-2 lg:grid-cols-4 max-w-7xl pt-8">
          {categories.map((category, index) => (
            <Link
              to={category.link}
              key={index}
              className="group relative overflow-hidden rounded-xl border bg-card p-6 transition-all hover:shadow-xl hover:-translate-y-1 hover:border-primary/50"
            >
              <div className="flex flex-col justify-between h-full">
                <div>
                  {category.icon}
                  <h3 className="font-bold text-xl mb-2">{category.title}</h3>
                  <p className="text-sm text-muted-foreground line-clamp-3 mb-4">
                    {category.description}
                  </p>
                </div>
                <div className="flex flex-wrap gap-1 mb-4">
                  {category.tools.slice(0, 4).map((tool, i) => (
                    <Badge
                      key={i}
                      variant="secondary"
                      className="text-[10px] px-1 py-0"
                    >
                      {tool}
                    </Badge>
                  ))}
                  {category.tools.length > 4 && (
                    <Badge
                      variant="secondary"
                      className="text-[10px] px-1 py-0"
                    >
                      +{category.tools.length - 4}
                    </Badge>
                  )}
                </div>
                <div className="flex items-center text-primary text-sm font-medium mt-auto">
                  View Tools{" "}
                  <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Features / Tech Stack Section */}
      <section className="container py-12 md:py-24 max-w-7xl mx-auto border-t px-4 md:px-6">
        <div className="mx-auto flex max-w-[58rem] flex-col items-center justify-center gap-4 text-center mb-12">
          <h2 className="text-3xl font-bold leading-[1.1] sm:text-3xl md:text-5xl">
            Built with Modern Tech
          </h2>
          <p className="max-w-[85%] leading-normal text-muted-foreground sm:text-lg sm:leading-7">
            dkutils is powered by the latest web technologies to ensure speed,
            security, and reliability.
          </p>
        </div>
        <div className="mx-auto grid justify-center gap-6 sm:grid-cols-1 md:grid-cols-3 md:max-w-[64rem]">
          <Card className="flex flex-col items-center text-center p-6 hover:shadow-md transition-shadow">
            <CardHeader className="p-0 mb-4">
              <div className="p-3 bg-chart-1/10 rounded-full">
                <Layout className="h-8 w-8 text-chart-1 " />
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <CardTitle className="mb-2">React + Vite</CardTitle>
              <CardDescription>
                Built on a blazing fast React frontend powered by Vite for
                instant load times and smooth interactions.
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="flex flex-col items-center text-center p-6 hover:shadow-md transition-shadow">
            <CardHeader className="p-0 mb-4">
              <div className="p-3 bg-chart-2/10 rounded-full">
                <Layers className="h-8 w-8 text-chart-2 " />
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <CardTitle className="mb-2">Tailwind + Shadcn</CardTitle>
              <CardDescription>
                Beautiful, accessible, and responsive UI components styled with
                Tailwind CSS for a modern look.
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="flex flex-col items-center text-center p-6 hover:shadow-md transition-shadow">
            <CardHeader className="p-0 mb-4">
              <div className="p-3 bg-chart-4/10 rounded-full">
                <Shield className="h-8 w-8 text-chart-4 " />
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <CardTitle className="mb-2">Secure & Private</CardTitle>
              <CardDescription>
                We prioritize your privacy. Many tools process files locally in
                your browser, ensuring data security.
              </CardDescription>
            </CardContent>
          </Card>
        </div>
      </section>
    </>
  );
};

export default HomePage;
