# Docker Bake file for building Catalyst components in parallel
# Usage: docker buildx bake --load

variable "TAG" {
  default = "latest"
}

group "default" {
  targets = ["operator", "web"]
}

target "operator" {
  context    = "./operator"
  dockerfile = "Dockerfile"
  tags       = ["controller:${TAG}"]
  platforms  = ["linux/amd64"]
}

target "web" {
  context    = "./web"
  dockerfile = "Dockerfile"
  tags       = ["catalyst-web:${TAG}"]
  platforms  = ["linux/amd64"]
}
