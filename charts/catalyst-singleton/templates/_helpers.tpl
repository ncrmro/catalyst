{{/*
Expand the name of the chart.
*/}}
{{- define "catalyst-singleton.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Create a default fully qualified app name.
We truncate at 63 chars because some Kubernetes name fields are limited to this (by the DNS naming spec).
If release name contains chart name it will be used as a full name.
*/}}
{{- define "catalyst-singleton.fullname" -}}
{{- if .Values.fullnameOverride }}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- $name := default .Chart.Name .Values.nameOverride }}
{{- if contains $name .Release.Name }}
{{- .Release.Name | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- printf "%s-%s" .Release.Name $name | trunc 63 | trimSuffix "-" }}
{{- end }}
{{- end }}
{{- end }}

{{/*
Create chart name and version as used by the chart label.
*/}}
{{- define "catalyst-singleton.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Common labels
*/}}
{{- define "catalyst-singleton.labels" -}}
helm.sh/chart: {{ include "catalyst-singleton.chart" . }}
{{ include "catalyst-singleton.selectorLabels" . }}
{{- if .Chart.AppVersion }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
{{- end }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end }}

{{/*
Selector labels
*/}}
{{- define "catalyst-singleton.selectorLabels" -}}
app.kubernetes.io/name: {{ include "catalyst-singleton.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}

{{/*
Create the name of the service account to use
*/}}
{{- define "catalyst-singleton.serviceAccountName" -}}
{{- if .Values.serviceAccount.create }}
{{- default (include "catalyst-singleton.fullname" .) .Values.serviceAccount.name }}
{{- else }}
{{- default "default" .Values.serviceAccount.name }}
{{- end }}
{{- end }}

{{/*
Docker Registry service name
*/}}
{{- define "catalyst-singleton.dockerRegistry.serviceName" -}}
{{- printf "%s-docker-registry" (include "catalyst-singleton.fullname" .) }}
{{- end }}

{{/*
Docker Registry service URL
*/}}
{{- define "catalyst-singleton.dockerRegistry.serviceUrl" -}}
{{- printf "%s:%d" (include "catalyst-singleton.dockerRegistry.serviceName" .) (.Values.dockerRegistry.service.port | int) }}
{{- end }}