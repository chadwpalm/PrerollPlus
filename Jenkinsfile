def dockerLogin() {
  withCredentials([usernamePassword(credentialsId: '71aeb696-0670-4267-8db4-8ee74774e051', usernameVariable: 'DOCKER_USERNAME', passwordVariable: 'DOCKER_PASSWORD')]) {
    sh ('echo $DOCKER_PASSWORD | docker login -u $DOCKER_USERNAME --password-stdin')
  }
}

def buildAndPush(String arch) {
  dockerLogin()
  def image = "${env.REPO}/${env.IMAGE_NAME}:${env.IMAGE_TAG}-${arch}"
  sh "docker build --force-rm --pull --build-arg BUILD='${env.APP_BUILD}' -t ${image} ."
  sh "docker push ${image}"
  sh "docker rmi ${image}"
}

pipeline {

  agent none

  environment {
      REPO="chadwpalm"
      IMAGE_NAME="prerollplus"
      BUILD_CRED=credentials('c8678c85-1f8d-4dc0-b9b0-e7fe12d6a24a')
  }

  options {
      timeout (time: 30, unit: 'MINUTES')
      buildDiscarder (logRotator (numToKeepStr: '3'))
  }

  stages {
    // Work out the version and tags once, so the build number is only incremented once per run
    stage('Version') {
      agent { label 'built-in' }
      steps {
        script {
          def PulledVersion = readJSON(file: "version.json").version
          // main reads the current build number; every other branch increments it
          def suffix = env.BRANCH_NAME == 'main' ? '/get' : ''
          def BuildNumber = sh (
            script: 'curl -fsS https://increment.build/${BUILD_CRED}' + suffix,
            returnStdout: true
          ).trim()
          def APPVersion = "${PulledVersion}.${BuildNumber}"
          env.APP_BUILD = BuildNumber
          if (env.BRANCH_NAME == 'main') {
            env.IMAGE_TAG = APPVersion
            env.ALIAS_TAG = 'latest'
          } else if (env.BRANCH_NAME == 'develop') {
            env.IMAGE_TAG = "develop-${APPVersion}"
            env.ALIAS_TAG = 'develop'
          } else {
            env.IMAGE_TAG = "${env.BRANCH_NAME}-${APPVersion}"
            env.ALIAS_TAG = ''
          }
          echo "Building ${REPO}/${IMAGE_NAME}:${env.IMAGE_TAG}" + (env.ALIAS_TAG ? " (+ ${env.ALIAS_TAG})" : '')
        }
      }
    }
    stage('Build') {
      parallel {
        stage('amd64') {
          agent { label 'built-in' }
          steps {
            script { buildAndPush('amd64') }
          }
        }
        stage('arm64') {
          agent { label 'arm64' }
          steps {
            script { buildAndPush('arm64') }
          }
        }
      }
    }
    stage('Manifest') {
      agent { label 'built-in' }
      steps {
        script {
          dockerLogin()
          def base = "${REPO}/${IMAGE_NAME}"
          def tags = "-t ${base}:${env.IMAGE_TAG}" + (env.ALIAS_TAG ? " -t ${base}:${env.ALIAS_TAG}" : '')
          sh "docker buildx imagetools create ${tags} ${base}:${env.IMAGE_TAG}-amd64 ${base}:${env.IMAGE_TAG}-arm64"
          sh "docker buildx imagetools inspect ${base}:${env.IMAGE_TAG}"
        }
      }
    }
    stage('Docs') {
      when {
        branch "main"
      }
      steps {
        // Rebuild the docs site so it picks up the new release
        build job: 'PrerollPlus-Docs/main', wait: false
      }
    }
  }
}
